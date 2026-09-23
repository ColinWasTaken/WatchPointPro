"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { submitReportAction, type ActionState } from "@/lib/actions/reports";

const initialState: ActionState = {};

type ChecklistItem = { id: string; label: string };

export function ReportForm({
  homeId,
  items,
}: {
  homeId: string;
  items: ChecklistItem[];
}) {
  const action = submitReportAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-sm">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink"
          >
            <input
              type="checkbox"
              name={`item-${item.id}`}
              className="h-4 w-4 accent-accent"
            />
            {item.label}
          </label>
        ))}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Overall status</legend>
        {[
          ["ok", "All good"],
          ["attention", "Needs attention"],
          ["urgent", "Urgent, please call the owner"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm text-ink shadow-sm">
            <input type="radio" name="status" value={value} defaultChecked={value === "ok"} className="h-4 w-4 accent-accent" />
            {label}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Notes
        <textarea
          name="notes"
          rows={4}
          placeholder="Anything the homeowner should know…"
          className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Photos (optional)
        <span className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-normal text-ink-muted">
          <Camera className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="w-full text-sm text-ink-muted file:mr-2 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent"
          />
        </span>
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
