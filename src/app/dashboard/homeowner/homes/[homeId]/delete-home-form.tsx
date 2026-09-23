"use client";

import { useActionState } from "react";
import { deleteHomeAction, type ActionState } from "@/lib/actions/homes";

const initialState: ActionState = {};

export function DeleteHomeForm({ homeId, nickname }: { homeId: string; nickname: string }) {
  const action = deleteHomeAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <details className="rounded-2xl bg-surface p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-danger">Delete this home</summary>
      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <p className="text-sm text-ink-muted">
          This permanently deletes the home, its checklist, reports, photos, messages, and visits. Type{" "}
          <span className="font-semibold text-ink">{nickname}</span> to confirm.
        </p>
        <input
          name="confirm"
          autoComplete="off"
          placeholder={nickname}
          className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-danger"
        />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete home permanently"}
        </button>
      </form>
    </details>
  );
}
