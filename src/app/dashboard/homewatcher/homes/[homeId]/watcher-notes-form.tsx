"use client";

import { useActionState } from "react";
import { updateWatcherNotesAction, type ActionState } from "@/lib/actions/assignments";

const initialState: ActionState = {};

export function WatcherNotesForm({
  homeId,
  initialNotes,
}: {
  homeId: string;
  initialNotes: string;
}) {
  const action = updateWatcherNotesAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <textarea
        name="watcherNotes"
        rows={3}
        defaultValue={initialNotes}
        placeholder="Anything worth remembering for your next visit…"
        className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
        {state.success && <span className="text-sm text-accent">{state.success}</span>}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
