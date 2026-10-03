"use client";

import { useActionState, useEffect } from "react";
import { sendPropertyMessageAction, type MessageState } from "@/lib/actions/property-messages";

export function PropertyMessageForm({ homeId, placeholder, hint }: { homeId: string; placeholder: string; hint: string }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendPropertyMessageAction.bind(null, homeId), {});

  // Opening a long thread starts at the newest messages and the box to reply in.
  useEffect(() => {
    document.getElementById("thread-end")?.scrollIntoView({ block: "end" });
  }, []);

  return (
    // Sent from the page's script (not as a plain form post): a plain post of this form leaves the
    // response hanging, and messages need the script anyway to show up as they arrive.
    <form action={(formData) => action(formData)} className="mt-4 rounded-3xl bg-surface p-3 shadow-sm">
      <label htmlFor="message-body" className="sr-only">
        Message
      </label>
      <textarea
        id="message-body"
        name="body"
        required
        maxLength={2000}
        rows={3}
        placeholder={placeholder}
        defaultValue={state.body}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
        className="w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-[15px] leading-relaxed text-ink outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : (
          <p className="text-xs text-ink-muted">{hint}</p>
        )}
        <button
          disabled={pending}
          className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
