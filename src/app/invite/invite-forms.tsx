"use client";

import { useActionState } from "react";
import { signOut } from "next-auth/react";
import type { ActionState } from "@/lib/actions/invitations";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const inputClass =
  "rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent";
const buttonClass =
  "w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60";

export function InvitationSignUpForm({
  action,
  email,
  defaultName,
}: {
  action: Action;
  email: string;
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Shown for password managers; the server always uses the invited address. */}
      <input type="email" value={email} readOnly autoComplete="username" aria-label="Email" className={`${inputClass} text-ink-muted`} />
      <input name="name" defaultValue={defaultName} required placeholder="Full name" autoComplete="name" className={inputClass} />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Create a password (8+ characters)"
        autoComplete="new-password"
        className={inputClass}
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}

export function AcceptInvitationButton({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Connecting…" : "Accept invitation"}
      </button>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

// Signs out of the wrong account and comes back to the invitation.
export function SwitchAccountButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl })} className={buttonClass}>
      Sign out and continue
    </button>
  );
}
