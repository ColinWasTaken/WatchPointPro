"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { updateHomeAction, type ActionState } from "@/lib/actions/homes";

const initialState: ActionState = {};

const inputClass =
  "rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent";
const labelClass = "flex flex-col gap-1 text-sm font-semibold text-ink";

export function EditHomeForm({
  homeId,
  nickname,
  address,
  notes,
  photoUrl,
}: {
  homeId: string;
  nickname: string;
  address: string;
  notes: string;
  photoUrl: string | null;
}) {
  const action = updateHomeAction.bind(null, homeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-sm"
    >
      <label className={labelClass}>
        Nickname
        <input name="nickname" required defaultValue={nickname} className={inputClass} />
      </label>

      <label className={labelClass}>
        Address
        <input name="address" required defaultValue={address} className={inputClass} />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">Photo</span>
        {photoUrl && (
          <>
            <Image
              src={photoUrl}
              alt="Current photo"
              width={480}
              height={200}
              className="h-40 w-full rounded-2xl object-cover"
            />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="removePhoto" className="h-4 w-4 accent-accent" />
              Remove this photo
            </label>
          </>
        )}
        <span className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-normal text-ink-muted">
          <Camera className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <input
            name="photo"
            type="file"
            accept="image/*"
            aria-label={photoUrl ? "Replace photo" : "Add photo"}
            className="w-full text-sm text-ink-muted file:mr-2 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent"
          />
        </span>
        <span className="text-xs text-ink-muted">
          {photoUrl ? "Choose a file to replace the current photo." : "Choose a file to add a photo."}
        </span>
      </div>

      <label className={labelClass}>
        Notes for your homewatcher
        <textarea name="notes" rows={4} defaultValue={notes} className={inputClass} />
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
