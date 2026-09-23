"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { sendMessageAction, type ActionState } from "@/lib/actions/messages";

const initialState: ActionState = {};

export function MessageComposer({
  homeId,
  recipientOptions,
}: {
  homeId: string;
  recipientOptions?: { id: string; label: string }[];
}) {
  const action = sendMessageAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  if (recipientOptions && recipientOptions.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink-muted">
        No active homewatcher to message yet.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-2">
      {recipientOptions && recipientOptions.length > 1 && (
        <select
          name="recipientId"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
        >
          {recipientOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <input
          name="content"
          placeholder="Write a message…"
          required
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send message"
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
