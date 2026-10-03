"use client";

import { useActionState, useState } from "react";
import type { IssueActionState } from "@/lib/actions/issues";
import { ISSUE_STATUSES, ISSUE_STATUS_LABEL, ISSUE_STATUS_TONE, type IssueStatus } from "@/lib/issues";

type Action = (prev: IssueActionState, formData: FormData) => Promise<IssueActionState>;

export function IssueUpdateForm({ action, current }: { action: Action; current: IssueStatus }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [status, setStatus] = useState<IssueStatus>(current);

  return (
    <form action={formAction} className="rounded-3xl bg-surface p-4 shadow-sm">
      <h2 className="font-bold text-ink">Update this issue</h2>
      <div role="radiogroup" aria-label="Status" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ISSUE_STATUSES.map((s) => (
          <label
            key={s}
            className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-2xl border px-2 text-center text-sm font-semibold transition-colors ${
              status === s ? `border-transparent ${ISSUE_STATUS_TONE[s]}` : "border-border bg-background text-ink-muted hover:text-ink"
            }`}
          >
            <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
            {ISSUE_STATUS_LABEL[s]}
          </label>
        ))}
      </div>
      <textarea
        name="note"
        rows={3}
        maxLength={2000}
        placeholder="Add a note (optional), e.g. Roofer booked for Tuesday."
        className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-ink outline-none focus:border-accent"
      />
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-accent">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 min-h-[48px] w-full rounded-full bg-accent text-sm font-bold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save update"}
      </button>
    </form>
  );
}
