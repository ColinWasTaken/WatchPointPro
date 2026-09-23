"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
  type ActionState,
} from "@/lib/actions/settings";

const initial: ActionState = {};
const input =
  "rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent";
const primary =
  "self-start rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60";

function Msg({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">{state.success}</p>}
    </>
  );
}

export function ProfileForm({ name, email, notifyEmail }: { name: string; email: string; notifyEmail: boolean }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Name
        <input name="name" required defaultValue={name} className={input} />
      </label>
      <p className="text-sm text-ink-muted">Email: {email}</p>
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="checkbox" name="notifyEmail" defaultChecked={notifyEmail} className="h-4 w-4 accent-accent" />
        Email me about new reports, messages, and visits
      </label>
      <Msg state={state} />
      <button disabled={pending} className={primary}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="current" type="password" required placeholder="Current password" className={input} />
      <input name="next" type="password" required minLength={8} placeholder="New password" className={input} />
      <input name="confirm" type="password" required minLength={8} placeholder="Confirm new password" className={input} />
      <Msg state={state} />
      <button disabled={pending} className={primary}>{pending ? "Updating…" : "Change password"}</button>
    </form>
  );
}

export function DeleteAccountForm({ isOwner }: { isOwner: boolean }) {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);
  return (
    <details className="rounded-2xl bg-surface p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-danger">Delete my account</summary>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <p className="text-sm text-ink-muted">
          {isOwner
            ? "This permanently deletes your account and every home, report, photo, and message in it."
            : "This permanently deletes your account, your reports, and your messages. Homes you watch are not deleted."}{" "}
          Enter your password to confirm.
        </p>
        <input name="password" type="password" required placeholder="Password" className={input} />
        <Msg state={state} />
        <button disabled={pending} className="self-start rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Deleting…" : "Delete account permanently"}
        </button>
      </form>
    </details>
  );
}
