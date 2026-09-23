"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { inviteHomewatcherAction, type ActionState } from "@/lib/actions/homes";

const initialState: ActionState = {};

export function InviteForm({ homeId }: { homeId: string }) {
  const action = inviteHomewatcherAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            strokeWidth={2}
          />
          <input
            name="email"
            type="email"
            required
            placeholder="homewatcher@example.com"
            className="w-full rounded-full border border-border bg-surface py-2 pl-10 pr-4 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Inviting…" : "Invite"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">{state.success}</p>}
    </form>
  );
}
