"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { Camera, Check, ChevronDown, Minus, TriangleAlert, Video, Wrench, X } from "lucide-react";
import {
  createMediaUploadAction,
  deleteMediaAction,
  discardInspectionAction,
  registerMediaAction,
  saveInspectionItemAction,
  saveInspectionSummaryAction,
  submitInspectionAction,
  type SaveResult,
} from "@/lib/actions/inspections";
import type { ItemStatus } from "@/lib/inspection-template";

export type EditorMedia = { id: string; kind: "photo" | "video"; url: string };
export type EditorItem = {
  id: string;
  label: string;
  status: ItemStatus | null;
  note: string;
  reading: string;
  readingUnit: string | null;
  media: EditorMedia[];
};

const OPTIONS: { value: ItemStatus; label: string; Icon: LucideIcon; on: string }[] = [
  { value: "good", label: "Good", Icon: Check, on: "border-accent bg-accent text-white" },
  { value: "needs_attention", label: "Attention", Icon: TriangleAlert, on: "border-pending bg-pending text-white" },
  { value: "repair_needed", label: "Repair", Icon: Wrench, on: "border-danger bg-danger text-white" },
  { value: "not_checked", label: "Not checked", Icon: Minus, on: "border-ink-muted bg-ink-muted text-white" },
];

const PHOTO_MAX_SIDE = 2048;

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
      const tooBig = xhr.status === 413 || /too large|exceeded/i.test(xhr.responseText);
      reject(new Error(tooBig ? "That file is too large." : "Upload failed. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(body);
  });
}

type Upload = { key: string; kind: "photo" | "video"; progress: number };

function ItemCard({
  item,
  onUpdate,
  onMedia,
  save,
  queueSave,
  flush,
  onUploading,
}: {
  item: EditorItem;
  onUpdate: (patch: Partial<EditorItem>) => void;
  // Media changes go through an updater so uploads that finish later never overwrite each other.
  onMedia: (change: (media: EditorMedia[]) => EditorMedia[]) => void;
  save: (fn: () => Promise<SaveResult>) => Promise<boolean>;
  queueSave: (key: string, run: () => Promise<SaveResult>) => void;
  flush: (key: string) => void;
  onUploading: (delta: number) => void;
}) {
  const problem = item.status === "needs_attention" || item.status === "repair_needed";
  const [open, setOpen] = useState(problem || Boolean(item.note) || item.media.length > 0);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const setStatus = (status: ItemStatus) => {
    onUpdate({ status });
    if (status === "needs_attention" || status === "repair_needed") setOpen(true);
    save(() => saveInspectionItemAction(item.id, { status }));
  };

  const noteKey = `${item.id}:note`;
  const readingKey = `${item.id}:reading`;
  const editNote = (note: string) => {
    onUpdate({ note });
    queueSave(noteKey, () => saveInspectionItemAction(item.id, { note }));
  };
  const editReading = (reading: string) => {
    onUpdate({ reading });
    queueSave(readingKey, () => saveInspectionItemAction(item.id, { reading }));
  };

  async function upload(file: File, kind: "photo" | "video") {
    const key = `${file.name}-${file.size}-${Math.random()}`;
    setUploads((list) => [...list, { key, kind, progress: 0 }]);
    onUploading(1);
    try {
      const body = kind === "photo" ? await shrinkPhoto(file) : file;
      const ticket = await createMediaUploadAction(item.id, { contentType: body.type || file.type, size: body.size });
      if ("error" in ticket) throw new Error(ticket.error);
      await putFile(ticket.uploadUrl, body, (progress) =>
        setUploads((list) => list.map((u) => (u.key === key ? { ...u, progress } : u))),
      );
      const added = await registerMediaAction(item.id, ticket.path);
      if ("error" in added) throw new Error(added.error);
      onMedia((media) => [...media, added.media]);
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploads((list) => list.filter((u) => u.key !== key));
      onUploading(-1);
    }
  }

  // Uploads run one after another so each item's media list stays in order.
  async function uploadAll(files: FileList | null, kind: "photo" | "video") {
    for (const file of Array.from(files ?? [])) await upload(file, kind);
  }

  const removeMedia = async (media: EditorMedia) => {
    if (!window.confirm(`Delete this ${media.kind}?`)) return;
    if (await save(() => deleteMediaAction(media.id))) {
      onMedia((list) => list.filter((m) => m.id !== media.id));
    }
  };

  return (
    <li className="rounded-3xl bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-ink">{item.label}</h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-ink-muted hover:text-accent"
        >
          {open ? "Hide details" : item.note || item.media.length ? `Details (${item.media.length + (item.note ? 1 : 0)})` : "Add details"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.5} />
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
              onChange={(e) => editReading(e.target.value)}
              onBlur={() => flush(readingKey)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder={item.readingUnit === "%" ? "48" : "74"}
              className="w-24 rounded-2xl border border-border bg-background px-3 py-2.5 text-base text-ink outline-none focus:border-accent"
            />
            <span className="text-ink-muted">{item.readingUnit}</span>
          </span>
        </label>
      )}

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={item.note}
            onChange={(e) => editNote(e.target.value)}
            onBlur={() => flush(noteKey)}
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
                    onClick={() => removeMedia(m)}
                    aria-label={`Delete ${m.kind}`}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-surface shadow"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {uploads.map((u) => (
            <div key={u.key} className="text-xs text-ink-muted">
              Uploading {u.kind}… {Math.round(u.progress * 100)}%
              <div className="mt-1 h-1.5 rounded-full bg-accent-soft">
                <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${Math.round(u.progress * 100)}%` }} />
              </div>
            </div>
          ))}
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
              uploadAll(e.target.files, "photo");
              e.target.value = "";
            }}
          />
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              uploadAll(e.target.files, "video");
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
  const [items, setItems] = useState(initialItems);
  const [summary, setSummary] = useState(initialSummary);
  const [saving, setSaving] = useState(0);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinishing] = useTransition();
  const inFlight = useRef(new Set<Promise<unknown>>());
  const queued = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => Promise<SaveResult> }>());
  const [queuedCount, setQueuedCount] = useState(0);

  // Runs a save, tracks it so Submit can wait for it, and surfaces failures in the header.
  const save = async (fn: () => Promise<SaveResult>) => {
    setSaving((n) => n + 1);
    const run = fn();
    inFlight.current.add(run);
    try {
      const result = await run;
      setError(result.error ?? null);
      return !result.error;
    } catch {
      setError("Couldn't save. Check your connection and try again.");
      return false;
    } finally {
      inFlight.current.delete(run);
      setSaving((n) => n - 1);
    }
  };

  // Typing saves itself shortly after the last keystroke, and at once on blur, when the app goes to
  // the background, or on submit, so nothing typed is lost if the phone is locked mid-check.
  const flush = (key: string) => {
    const entry = queued.current.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    queued.current.delete(key);
    setQueuedCount(queued.current.size);
    save(entry.run);
  };
  const queueSave = (key: string, run: () => Promise<SaveResult>) => {
    const entry = queued.current.get(key);
    if (entry) clearTimeout(entry.timer);
    queued.current.set(key, { timer: setTimeout(() => flush(key), 700), run });
    setQueuedCount(queued.current.size);
  };
  const flushAll = () => [...queued.current.keys()].forEach(flush);

  const flushInBackground = useEffectEvent(() => flushAll());
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushInBackground();
    };
    const onPageHide = () => flushInBackground();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  const update = (id: string, patch: Partial<EditorItem>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const updateMedia = (id: string, change: (media: EditorMedia[]) => EditorMedia[]) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, media: change(item.media) } : item)));

  const editSummary = (value: string) => {
    setSummary(value);
    queueSave("summary", () => saveInspectionSummaryAction(inspectionId, value));
  };

  const marked = items.filter((i) => i.status).length;

  const submit = () => {
    if (!window.confirm("Submit this report? The homeowner will be notified, and the report can't be edited afterwards.")) return;
    startFinishing(async () => {
      flushAll();
      await Promise.allSettled([...inFlight.current]);
      const result = await submitInspectionAction(inspectionId, summary);
      if (result?.error) setError(result.error);
    });
  };

  const discard = () => {
    if (!window.confirm("Discard this check? Everything recorded so far, including photos and videos, will be deleted.")) return;
    queued.current.forEach((entry) => clearTimeout(entry.timer));
    queued.current.clear();
    startFinishing(async () => {
      const result = await discardInspectionAction(inspectionId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 mb-4 bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">
            {marked} of {items.length} checked
          </span>
          <span className={error ? "text-danger" : "text-ink-muted"}>
            {uploading > 0 ? "Uploading…" : saving > 0 || queuedCount > 0 ? "Saving…" : error ? error : "All changes saved"}
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
            onUpdate={(patch) => update(item.id, patch)}
            onMedia={(change) => updateMedia(item.id, change)}
            save={save}
            queueSave={queueSave}
            flush={flush}
            onUploading={(delta) => setUploading((n) => n + delta)}
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
          disabled={finishing || uploading > 0}
          className="mt-3 min-h-[56px] w-full rounded-full bg-accent text-base font-bold tracking-wide text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {finishing ? "Submitting…" : uploading > 0 ? "Waiting for uploads…" : "SUBMIT REPORT"}
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
