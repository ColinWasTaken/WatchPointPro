"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { useOffline } from "next/offline";
import type { LucideIcon } from "lucide-react";
import { Camera, Check, ChevronDown, CloudOff, Minus, TriangleAlert, Video, Wrench, X } from "lucide-react";
import {
  createMediaUploadAction,
  deleteMediaAction,
  discardInspectionAction,
  registerMediaAction,
  saveInspectionItemAction,
  saveInspectionSummaryAction,
  submitInspectionAction,
} from "@/lib/actions/inspections";
import { formatReading, typicalRange, type ItemStatus } from "@/lib/inspection-template";
import { MEDIA_LIMITS } from "@/lib/media-limits";
import { forgetUpload, keepUpload, pendingUploads, type QueuedUpload } from "@/lib/offline-uploads";

// The home-check editor. It's built to keep working without signal:
//  - Every edit goes into an outbox saved on the phone, and is removed only once the server has
//    it. Server Actions wait out a lost connection and retry by themselves (experimental.useOffline),
//    and anything still in the outbox when the check is reopened is sent again.
//  - Saves are one at a time per field, so an older value can never land after a newer one.
//  - Photos and videos are kept on the phone (IndexedDB) until they're uploaded and attached.

export type EditorMedia = { id: string; kind: "photo" | "video"; url: string };
export type EditorItem = {
  id: string;
  key: string;
  label: string;
  status: ItemStatus | null;
  note: string;
  reading: string;
  readingUnit: string | null;
  media: EditorMedia[];
};

type Field = "status" | "note" | "reading";
type Change = { kind: "item"; itemId: string; field: Field; value: string } | { kind: "summary"; value: string };
type UploadState = { id: string; itemId: string; kind: "photo" | "video"; progress: number; waiting: boolean };

const OPTIONS: { value: ItemStatus; label: string; Icon: LucideIcon; on: string }[] = [
  { value: "good", label: "Good", Icon: Check, on: "border-accent bg-accent text-white" },
  { value: "needs_attention", label: "Attention", Icon: TriangleAlert, on: "border-pending bg-pending text-white" },
  { value: "repair_needed", label: "Repair", Icon: Wrench, on: "border-danger bg-danger text-white" },
  { value: "not_checked", label: "Not checked", Icon: Minus, on: "border-ink-muted bg-ink-muted text-white" },
];

const PHOTO_MAX_SIDE = 2048;
const TYPING_DELAY_MS = 700;

// Phone photos are often 3–12 MB; a 2048px JPEG is plenty for a report and uploads much faster.
async function shrinkPhoto(file: File): Promise<Blob> {
  if (file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // a format this browser can't decode: upload the original
  }
}

// Storage answered, but said no. (A network failure is a plain Error instead, and gets retried.)
class UploadRefused extends Error {
  constructor(
    message: string,
    readonly reason: "duplicate" | "final" | "expired",
  ) {
    super(message);
  }
}

// Straight to storage with the one-time URL; XHR because fetch can't report upload progress.
function putFile(url: string, body: Blob, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", body.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const text = xhr.responseText;
      if (/Duplicate|already exists/i.test(text)) {
        // An earlier try got through but its reply was lost.
        return reject(new UploadRefused("Already uploaded.", "duplicate"));
      }
      if (xhr.status === 413 || /too large|exceeded|"413"/i.test(text)) return reject(new UploadRefused("That file is too large.", "final"));
      if (/"415"|mime/i.test(text)) return reject(new UploadRefused("That file type can't be added.", "final"));
      reject(new UploadRefused("The upload link expired.", "expired"));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(body);
  });
}

// Resolves when the browser reports it's back online, or after a while (it doesn't always say).
const waitForConnection = () =>
  new Promise<void>((resolve) => {
    const done = () => {
      window.removeEventListener("online", done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 8000);
    window.addEventListener("online", done);
  });

const newUpload = (inspectionId: string, itemId: string, kind: "photo" | "video", blob: Blob): QueuedUpload => ({
  id: crypto.randomUUID(),
  inspectionId,
  itemId,
  kind,
  blob,
  createdAt: Date.now(),
});

const outboxKey = (inspectionId: string) => `wpp-outbox:${inspectionId}`;

function loadOutbox(inspectionId: string): [string, Change][] {
  try {
    return Object.entries(JSON.parse(localStorage.getItem(outboxKey(inspectionId)) ?? "{}"));
  } catch {
    return [];
  }
}

function storeOutbox(inspectionId: string, outbox: Map<string, Change>) {
  try {
    if (outbox.size) localStorage.setItem(outboxKey(inspectionId), JSON.stringify(Object.fromEntries(outbox)));
    else localStorage.removeItem(outboxKey(inspectionId));
  } catch {
    // Storage full or blocked: edits still go out while the page stays open.
  }
}

function ItemCard({
  item,
  offline,
  uploads,
  uploadError,
  onEdit,
  onLeaveField,
  onAddFiles,
  onRemoveMedia,
}: {
  item: EditorItem;
  offline: boolean;
  uploads: UploadState[];
  uploadError: string | undefined;
  onEdit: (field: Field, value: string) => void;
  onLeaveField: (field: Field) => void;
  onAddFiles: (files: File[], kind: "photo" | "video") => void;
  onRemoveMedia: (media: EditorMedia) => void;
}) {
  const problem = item.status === "needs_attention" || item.status === "repair_needed";
  // Details open by themselves when there's something to show (including edits restored from
  // this phone) unless the inspector has opened or closed them by hand.
  const [open, setOpen] = useState<boolean | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const showDetails = uploads.length > 0 || (open ?? (problem || Boolean(item.note) || item.media.length > 0));
  // A reading outside what's usual for an empty home is pointed out straight away, while still on site.
  const range = typicalRange(item.key, item.readingUnit);
  const value = item.reading.trim() === "" ? NaN : Number(item.reading);
  const unusual = range && Number.isFinite(value) && (value > range.high || value < range.low) ? range : null;

  const setStatus = (status: ItemStatus) => {
    onEdit("status", status);
    if (status === "needs_attention" || status === "repair_needed") setOpen(true);
  };

  return (
    <li className="rounded-3xl bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-ink">{item.label}</h3>
        <button
          type="button"
          onClick={() => setOpen(!showDetails)}
          aria-expanded={showDetails}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-ink-muted hover:text-accent"
        >
          {showDetails ? "Hide details" : item.note || item.media.length ? `Details (${item.media.length + (item.note ? 1 : 0)})` : "Add details"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} strokeWidth={2.5} />
        </button>
      </div>

      <div role="radiogroup" aria-label={`${item.label} status`} className="mt-3 grid grid-cols-4 gap-1.5">
        {OPTIONS.map(({ value, label, Icon, on }) => {
          const selected = item.status === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setStatus(value)}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-[11px] font-semibold leading-tight transition-colors ${
                selected ? on : "border-border bg-background text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.25} />
              {label}
            </button>
          );
        })}
      </div>

      {item.readingUnit && (
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
          Reading
          <span className="flex items-center gap-1.5">
            <input
              inputMode="decimal"
              value={item.reading}
              onChange={(e) => onEdit("reading", e.target.value)}
              onBlur={() => onLeaveField("reading")}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder={item.readingUnit === "%" ? "48" : item.readingUnit === "°F" ? "74" : undefined}
              className="w-24 rounded-2xl border border-border bg-background px-3 py-2.5 text-base text-ink outline-none focus:border-accent"
            />
            <span className="text-ink-muted">{item.readingUnit}</span>
          </span>
        </label>
      )}
      {unusual && item.readingUnit && (
        <p role="status" className="mt-2 text-sm text-danger">
          {formatReading(value, item.readingUnit)} is outside the typical {unusual.low}–{formatReading(unusual.high, item.readingUnit)}.{" "}
          {unusual.why}
          {!problem && " Mark it Attention if it needs follow-up."}
        </p>
      )}

      {showDetails && (
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={item.note}
            onChange={(e) => onEdit("note", e.target.value)}
            onBlur={() => onLeaveField("note")}
            rows={3}
            maxLength={2000}
            placeholder={problem ? "What did you find? e.g. Cracked roof tile above the garage." : "Notes (optional)"}
            className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-ink outline-none focus:border-accent"
          />

          {item.media.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {item.media.map((m) => (
                <li key={m.id} className="relative">
                  {m.kind === "photo" ? (
                    <a href={m.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={`${item.label} photo`} className="h-20 w-20 rounded-xl object-cover" />
                    </a>
                  ) : (
                    <video src={m.url} controls preload="metadata" className="h-20 w-32 rounded-xl bg-black object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveMedia(m)}
                    aria-label={`Delete ${m.kind}`}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-surface shadow"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {uploads.map((u) =>
            u.waiting || offline ? (
              <p key={u.id} className="flex items-center gap-1.5 text-xs font-semibold text-pending">
                <CloudOff className="h-3.5 w-3.5" strokeWidth={2.25} />
                {u.kind === "photo" ? "Photo" : "Video"} saved on this phone · uploads when there&apos;s signal
              </p>
            ) : (
              <div key={u.id} className="text-xs text-ink-muted">
                Uploading {u.kind}… {Math.round(u.progress * 100)}%
                <div className="mt-1 h-1.5 rounded-full bg-accent-soft">
                  <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                </div>
              </div>
            ),
          )}
          {uploadError && <p className="text-sm text-danger">{uploadError}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-accent-soft text-sm font-semibold text-accent"
            >
              <Camera className="h-5 w-5" strokeWidth={2} /> Add photo
            </button>
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-accent-soft text-sm font-semibold text-accent"
            >
              <Video className="h-5 w-5" strokeWidth={2} /> Add video
            </button>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onAddFiles(Array.from(e.target.files ?? []), "photo");
              e.target.value = "";
            }}
          />
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              onAddFiles(Array.from(e.target.files ?? []), "video");
              e.target.value = "";
            }}
          />
        </div>
      )}
    </li>
  );
}

export function InspectionEditor({
  inspectionId,
  initialItems,
  initialSummary,
  canDiscard,
}: {
  inspectionId: string;
  initialItems: EditorItem[];
  initialSummary: string;
  canDiscard: boolean;
}) {
  const offline = useOffline();
  const [items, setItems] = useState(initialItems);
  const [summary, setSummary] = useState(initialSummary);
  const [unsaved, setUnsaved] = useState(0);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinishing] = useTransition();

  const outbox = useRef(new Map<string, Change>());
  const sending = useRef(new Map<string, Promise<void>>());
  const sendAgain = useRef(new Set<string>());
  const typing = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const uploadQueue = useRef<QueuedUpload[]>([]);
  const uploadRunning = useRef(false);

  const persist = () => {
    storeOutbox(inspectionId, outbox.current);
    setUnsaved(outbox.current.size);
  };

  // Sends the latest value for one field. One save per field at a time; a newer edit made meanwhile
  // goes out right after. Offline, the action simply waits for the connection.
  const send = (key: string) => {
    if (sending.current.has(key)) {
      sendAgain.current.add(key);
      return;
    }
    const change = outbox.current.get(key);
    if (!change) return;
    const run = (async () => {
      try {
        const result =
          change.kind === "summary"
            ? await saveInspectionSummaryAction(inspectionId, change.value)
            : await saveInspectionItemAction(change.itemId, { [change.field]: change.value });
        // Saved, or refused for a reason a retry won't fix (shown below): either way it's done.
        if (outbox.current.get(key) === change) {
          outbox.current.delete(key);
          persist();
        }
        setError(result.error ?? null);
      } catch {
        setError("Couldn't save. Trying again…");
        await waitForConnection();
        sendAgain.current.add(key);
      } finally {
        sending.current.delete(key);
        if (sendAgain.current.delete(key)) send(key);
      }
    })();
    sending.current.set(key, run);
  };

  const record = (key: string, change: Change, delay = 0) => {
    outbox.current.set(key, change);
    persist();
    clearTimeout(typing.current.get(key));
    typing.current.delete(key);
    if (delay) {
      typing.current.set(
        key,
        setTimeout(() => {
          typing.current.delete(key);
          send(key);
        }, delay),
      );
    } else {
      send(key);
    }
  };

  // Typing goes out shortly after the last keystroke, and at once on blur, app switch, or submit.
  const flush = (key: string) => {
    if (!typing.current.has(key)) return;
    clearTimeout(typing.current.get(key));
    typing.current.delete(key);
    send(key);
  };
  const flushAll = () => [...typing.current.keys()].forEach(flush);

  const whenSaved = async () => {
    flushAll();
    while (sending.current.size > 0) await Promise.allSettled([...sending.current.values()]);
  };

  const setItem = (id: string, change: (item: EditorItem) => EditorItem) =>
    setItems((list) => list.map((item) => (item.id === id ? change(item) : item)));

  const editItem = (item: EditorItem, field: Field, value: string) => {
    setItem(item.id, (current) => ({ ...current, [field]: value }));
    record(`${item.id}:${field}`, { kind: "item", itemId: item.id, field, value }, field === "status" ? 0 : TYPING_DELAY_MS);
  };

  const editSummary = (value: string) => {
    setSummary(value);
    record("summary", { kind: "summary", value }, TYPING_DELAY_MS);
  };

  // ---- Photos and videos ----

  const setUpload = (id: string, patch: Partial<UploadState>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  // Uploads one file; returns the attached media, or a message if it can't be added.
  const uploadOne = async (u: QueuedUpload): Promise<EditorMedia | string> => {
    for (let ticketTries = 0; ticketTries < 3; ticketTries++) {
      const ticket = await createMediaUploadAction(u.itemId, { contentType: u.blob.type, size: u.blob.size });
      if ("error" in ticket) return ticket.error;
      let expired = false;
      for (;;) {
        try {
          await putFile(ticket.uploadUrl, u.blob, (progress) => setUpload(u.id, { progress, waiting: false }));
          break;
        } catch (err) {
          if (err instanceof UploadRefused) {
            if (err.reason === "duplicate") break;
            if (err.reason === "final") return err.message;
            expired = true; // ask for a fresh link
            break;
          }
          setUpload(u.id, { waiting: true, progress: 0 });
          await waitForConnection();
        }
      }
      if (expired) continue;
      const added = await registerMediaAction(u.itemId, ticket.path);
      return "error" in added ? added.error : added.media;
    }
    return "Upload failed. Please try again.";
  };

  const processUploads = async () => {
    if (uploadRunning.current) return;
    uploadRunning.current = true;
    try {
      while (uploadQueue.current.length > 0) {
        const next = uploadQueue.current[0];
        const result = await uploadOne(next);
        uploadQueue.current.shift();
        await forgetUpload(next.id).catch(() => {});
        setUploads((list) => list.filter((u) => u.id !== next.id));
        if (typeof result === "string") {
          setUploadErrors((errors) => ({ ...errors, [next.itemId]: result }));
        } else {
          setUploadErrors((errors) => ({ ...errors, [next.itemId]: "" }));
          setItem(next.itemId, (item) => ({ ...item, media: [...item.media, result] }));
        }
      }
    } finally {
      uploadRunning.current = false;
    }
  };

  const enqueue = (upload: QueuedUpload) => {
    if (uploadQueue.current.some((u) => u.id === upload.id)) return;
    uploadQueue.current.push(upload);
    setUploads((list) => [...list, { id: upload.id, itemId: upload.itemId, kind: upload.kind, progress: 0, waiting: false }]);
    processUploads();
  };

  const addFiles = async (itemId: string, files: File[], kind: "photo" | "video") => {
    for (const file of files) {
      const blob = kind === "photo" ? await shrinkPhoto(file) : file;
      if (blob.size > MEDIA_LIMITS[kind]) {
        setUploadErrors((errors) => ({
          ...errors,
          [itemId]: kind === "video" ? "Videos can be up to 50 MB (about 30 seconds)." : "Photos can be up to 20 MB.",
        }));
        continue;
      }
      const upload = newUpload(inspectionId, itemId, kind, blob);
      await keepUpload(upload).catch(() => {}); // kept on the phone until it's attached
      enqueue(upload);
    }
  };

  const removeMedia = async (itemId: string, media: EditorMedia) => {
    if (!window.confirm(`Delete this ${media.kind}?`)) return;
    const result = await deleteMediaAction(media.id);
    if (result.error) return setError(result.error);
    setItem(itemId, (item) => ({ ...item, media: item.media.filter((m) => m.id !== media.id) }));
  };

  // ---- Reopening a check: pick up anything this phone hadn't sent yet ----

  const resume = useEffectEvent((saved: [string, Change][], queued: QueuedUpload[]) => {
    if (saved.length > 0) {
      for (const [key, change] of saved) outbox.current.set(key, change);
      persist();
      setItems((list) =>
        list.map((item) =>
          saved.reduce(
            (current, [, change]) =>
              change.kind === "item" && change.itemId === item.id ? { ...current, [change.field]: change.value } : current,
            item,
          ),
        ),
      );
      const savedSummary = saved.find(([, change]) => change.kind === "summary")?.[1];
      if (savedSummary) setSummary(savedSummary.value);
      for (const [key] of saved) send(key);
    }
    queued.sort((a, b) => a.createdAt - b.createdAt).forEach(enqueue);
  });

  const flushInBackground = useEffectEvent(() => flushAll());

  useEffect(() => {
    let active = true;
    Promise.all([loadOutbox(inspectionId), pendingUploads(inspectionId).catch(() => [] as QueuedUpload[])]).then(
      ([saved, queued]) => active && resume(saved, queued),
    );
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushInBackground();
    };
    const onPageHide = () => flushInBackground();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [inspectionId]);

  // ---- Finishing ----

  const marked = items.filter((i) => i.status).length;

  const submit = () => {
    if (!window.confirm("Submit this report? The homeowner will be notified, and the report can't be edited afterwards.")) return;
    startFinishing(async () => {
      await whenSaved();
      const result = await submitInspectionAction(inspectionId, summary);
      if (result?.error) setError(result.error);
    });
  };

  const discard = () => {
    if (!window.confirm("Discard this check? Everything recorded so far, including photos and videos, will be deleted.")) return;
    typing.current.forEach((timer) => clearTimeout(timer));
    typing.current.clear();
    outbox.current.clear();
    persist();
    const queued = uploadQueue.current.splice(0);
    startFinishing(async () => {
      await Promise.all(queued.map((u) => forgetUpload(u.id).catch(() => {})));
      const result = await discardInspectionAction(inspectionId);
      if (result?.error) setError(result.error);
    });
  };

  const pending = unsaved + uploads.length;
  const status = error
    ? { text: error, tone: "text-danger" }
    : offline
      ? {
          text: pending ? `Offline · ${pending} ${pending === 1 ? "change" : "changes"} saved on this phone` : "Offline · edits are saved on this phone",
          tone: "text-pending",
        }
      : uploads.length
        ? { text: "Uploading…", tone: "text-ink-muted" }
        : unsaved
          ? { text: "Saving…", tone: "text-ink-muted" }
          : { text: "All changes saved", tone: "text-ink-muted" };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 mb-4 bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="shrink-0 font-semibold text-ink">
            {marked} of {items.length} checked
          </span>
          <span className={`text-right ${status.tone}`} role="status">
            {status.text}
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-accent-soft">
          <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${(marked / items.length) * 100}%` }} />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            offline={offline}
            uploads={uploads.filter((u) => u.itemId === item.id)}
            uploadError={uploadErrors[item.id] || undefined}
            onEdit={(field, value) => editItem(item, field, value)}
            onLeaveField={(field) => flush(`${item.id}:${field}`)}
            onAddFiles={(files, kind) => addFiles(item.id, files, kind)}
            onRemoveMedia={(media) => removeMedia(item.id, media)}
          />
        ))}
      </ul>

      <section className="mt-6 rounded-3xl bg-surface p-4 shadow-sm">
        <h3 className="font-bold text-ink">Summary for the homeowner</h3>
        <textarea
          value={summary}
          onChange={(e) => editSummary(e.target.value)}
          onBlur={() => flush("summary")}
          rows={5}
          maxLength={4000}
          placeholder="Overall the property looks good. AC and pool are operating normally. One cracked roof tile was observed above the garage and may need inspection."
          className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-ink outline-none focus:border-accent"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={finishing || uploads.length > 0}
          className="mt-3 min-h-[56px] w-full rounded-full bg-accent text-base font-bold tracking-wide text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {finishing
            ? offline
              ? "Will submit when you're back online…"
              : "Submitting…"
            : uploads.length > 0
              ? offline
                ? "Uploads finish when you're back online"
                : "Waiting for uploads…"
              : "SUBMIT REPORT"}
        </button>
        {canDiscard && (
          <button
            type="button"
            onClick={discard}
            disabled={finishing}
            className="mt-3 w-full text-center text-sm font-semibold text-ink-muted hover:text-danger"
          >
            Discard this check
          </button>
        )}
      </section>
    </div>
  );
}
