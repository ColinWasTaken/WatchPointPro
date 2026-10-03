"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { resetChecklistAction, saveChecklistAction, type ChecklistResult } from "@/lib/actions/company-checklist";
import type { TemplateItem } from "@/lib/inspection-template";

// Editing a company's home check checklist: rename, reorder, remove, and add items, and choose
// which ones take a reading. Nothing changes until it's saved.

type Row = { id: string; key: string; label: string; unit: string; otherUnit: boolean };

const PRESET_UNITS = ["°F", "%"];
const toRow = (item: TemplateItem, id = item.key): Row => ({
  id,
  key: item.key,
  label: item.label,
  unit: item.readingUnit ?? "",
  otherUnit: Boolean(item.readingUnit) && !PRESET_UNITS.includes(item.readingUnit ?? ""),
});
const signature = (rows: Row[]) => JSON.stringify(rows.map((r) => [r.key, r.label.trim(), r.unit.trim()]));

const input = "rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const iconButton =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted";
const primary =
  "rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60";
const secondary =
  "rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-60";

export function CompanyChecklistEditor({
  initial,
  custom: initialCustom,
  standard,
}: {
  initial: TemplateItem[];
  custom: boolean;
  standard: TemplateItem[];
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((item) => toRow(item)));
  const [saved, setSaved] = useState(() => signature(initial.map((item) => toRow(item))));
  const [custom, setCustom] = useState(initialCustom);
  const [result, setResult] = useState<ChecklistResult>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();
  const added = useRef(0);

  const dirty = signature(rows) !== saved;
  const missing = standard.filter((s) => !rows.some((r) => r.key === s.key));
  const name = (row: Row, i: number) => row.label.trim() || `item ${i + 1}`;

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  function move(index: number, by: -1 | 1) {
    const row = rows[index];
    const to = index + by;
    setRows((rs) => {
      const next = [...rs];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
    setAnnouncement(`${name(row, index)} moved to position ${to + 1} of ${rows.length}.`);
    // Keep the keyboard where it was; at the top or bottom, the other arrow is the one still usable.
    const atEnd = to === 0 || to === rows.length - 1;
    const direction = by < 0 ? "up" : "down";
    const other = by < 0 ? "down" : "up";
    requestAnimationFrame(() => document.getElementById(`${row.id}-${atEnd ? other : direction}`)?.focus());
  }

  function remove(index: number) {
    const row = rows[index];
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    setAnnouncement(`${name(row, index)} removed.`);
  }

  function add(item: TemplateItem) {
    setRows((rs) => [...rs, toRow(item, `new-${added.current++}`)]);
    setAnnouncement(`${item.label} added at the end.`);
  }

  function apply(next: ChecklistResult) {
    setResult(next);
    if (next.items) {
      // The server's copy has keys for new items, so further edits keep them.
      const fresh = next.items.map((item) => toRow(item));
      setRows(fresh);
      setSaved(signature(fresh));
      setCustom(Boolean(next.custom));
    }
  }

  const save = () =>
    startTransition(async () => {
      apply(await saveChecklistAction(rows.map((r) => ({ key: r.key, label: r.label, unit: r.unit }))));
    });
  const reset = () =>
    startTransition(async () => {
      setConfirmReset(false);
      apply(await resetChecklistAction());
    });

  return (
    <div className="mt-6 flex flex-col gap-5 rounded-3xl bg-surface p-4 shadow-sm sm:p-6">
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-background p-2 sm:flex-nowrap">
            <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-ink-muted" aria-hidden>
              {i + 1}
            </span>
            <input
              value={row.label}
              onChange={(e) => update(row.id, { label: e.target.value })}
              maxLength={60}
              aria-label={`Item ${i + 1}`}
              className={`${input} min-w-0 flex-1 basis-[calc(100%-2.5rem)] sm:basis-auto`}
            />
            {/* On phones this wraps under the name, and the arrows wrap again if a unit field needs the room. */}
            <div className="ml-8 flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:ml-0 sm:flex-none sm:flex-nowrap">
              <select
                value={row.otherUnit ? "other" : row.unit}
                onChange={(e) => {
                  const v = e.target.value;
                  update(row.id, v === "other" ? { unit: "", otherUnit: true } : { unit: v, otherUnit: false });
                }}
                aria-label={`Reading for ${name(row, i)}`}
                className={`${input} min-w-32 flex-1 sm:w-36 sm:flex-none`}
              >
                <option value="">No reading</option>
                <option value="°F">Reading in °F</option>
                <option value="%">Reading in %</option>
                <option value="other">Other reading…</option>
              </select>
              {row.otherUnit && (
                <input
                  value={row.unit}
                  onChange={(e) => update(row.id, { unit: e.target.value })}
                  maxLength={10}
                  placeholder="Unit"
                  aria-label={`Unit for ${name(row, i)}`}
                  className={`${input} w-20`}
                />
              )}
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button type="button" id={`${row.id}-up`} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${name(row, i)} up`} className={iconButton}>
                  <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  id={`${row.id}-down`}
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label={`Move ${name(row, i)} down`}
                  className={iconButton}
                >
                  <ArrowDown className="h-4 w-4" strokeWidth={2.25} />
                </button>
                <button type="button" onClick={() => remove(i)} aria-label={`Remove ${name(row, i)}`} className={iconButton}>
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newLabel.trim()) return;
          add({ key: "", label: newLabel.trim() });
          setNewLabel("");
        }}
        className="flex gap-2"
      >
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          maxLength={60}
          placeholder="Add an item, like Wine fridge"
          aria-label="New item"
          className={`${input} min-w-0 flex-1`}
        />
        <button type="submit" className={`flex items-center gap-1.5 ${secondary}`}>
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Add
        </button>
      </form>

      {missing.length > 0 && (
        <div>
          <p className="text-sm text-ink-muted">Standard items not in your checklist</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missing.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => add(item)}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button type="button" onClick={save} disabled={pending || !dirty} className={primary}>
          {pending ? "Saving…" : "Save checklist"}
        </button>
        {dirty && <span className="text-sm text-ink-muted">Unsaved changes</span>}
        {custom && !confirmReset && (
          <button type="button" onClick={() => setConfirmReset(true)} className="ml-auto text-sm font-semibold text-ink-muted hover:text-danger">
            Reset to standard
          </button>
        )}
      </div>
      {confirmReset && (
        <div className="rounded-2xl bg-background p-4 text-sm text-ink">
          <p>Replace your checklist with the standard one? New home checks will use the standard items.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={reset} disabled={pending} className="rounded-full bg-danger px-4 py-2 font-semibold text-white disabled:opacity-60">
              Reset checklist
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className={secondary}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {result.error && (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      )}
      {result.success && !dirty && (
        <p role="status" className="text-sm text-accent">
          {result.success}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

export function ChecklistList({ items }: { items: TemplateItem[] }) {
  return (
    <ol className="mt-6 flex flex-col gap-2 rounded-3xl bg-surface p-6 text-sm shadow-sm">
      {items.map((item, i) => (
        <li key={item.key} className="flex gap-3">
          <span className="w-5 shrink-0 text-right tabular-nums text-ink-muted">{i + 1}</span>
          <span className="text-ink">{item.label}</span>
          {item.readingUnit && <span className="text-ink-muted">reading in {item.readingUnit}</span>}
        </li>
      ))}
    </ol>
  );
}
