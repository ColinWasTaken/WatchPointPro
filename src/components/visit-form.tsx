"use client";

import { useActionState, useEffect, useRef } from "react";
import { CalendarPlus } from "lucide-react";
import { scheduleVisitAction, type ActionState } from "@/lib/actions/visits";

const initialState: ActionState = {};

export function VisitForm({ homeId }: { homeId: string }) {
  const action = scheduleVisitAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      action={(fd) => {
        // datetime-local has no timezone; convert using the browser's so it's stored correctly.
        const local = String(fd.get("local") ?? "");
        fd.set("when", local ? new Date(local).toISOString() : "");
        formAction(fd);
      }}
      className="mt-3 flex flex-col gap-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="datetime-local"
          name="local"
          required
          className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <input
          name="note"
          maxLength={300}
          placeholder="Note (optional)"
          className="flex-1 rounded-2xl border border-border bg-background px-4 py-2 text-sm text-ink outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        <CalendarPlus className="h-4 w-4" strokeWidth={2} />
        {pending ? "Scheduling…" : "Schedule visit"}
      </button>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">{state.success}</p>}
    </form>
  );
}
