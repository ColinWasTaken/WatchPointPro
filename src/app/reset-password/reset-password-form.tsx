"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/lib/actions/account";

const initialState: ActionState = {};
const inputClass =
  "rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent";

export function ResetPasswordForm({ token }: { token: string }) {
  const action = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="password" type="password" required minLength={8} placeholder="New password" className={inputClass} />
      <input name="confirm" type="password" required minLength={8} placeholder="Confirm new password" className={inputClass} />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
