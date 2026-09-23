"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { createHomeAction, type ActionState } from "@/lib/actions/homes";

const initialState: ActionState = {};

const inputClass =
  "rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent";
const labelClass = "flex flex-col gap-1 text-sm font-semibold text-ink";

export function AddHomeForm() {
  const [state, formAction, pending] = useActionState(
    createHomeAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-sm"
    >
      <label className={labelClass}>
        Nickname
        <input
          name="nickname"
          required
          placeholder="e.g. Lake House"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Address
        <input
          name="address"
          required
          placeholder="123 Main St, Springfield"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Photo (optional)
        <span className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-normal text-ink-muted">
          <Camera className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="w-full text-sm text-ink-muted file:mr-2 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent"
          />
        </span>
      </label>

      <label className={labelClass}>
        Notes for your homewatcher (optional)
        <textarea
          name="notes"
          rows={4}
          placeholder="Access codes, pet info, etc."
          className={inputClass}
        />
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add home"}
      </button>
    </form>
  );
}
