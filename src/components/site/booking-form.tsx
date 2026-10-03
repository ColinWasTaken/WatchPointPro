"use client";

import { useActionState } from "react";
import { requestConsultationAction, type InquiryState } from "@/lib/actions/inquiries";

const field =
  "mt-2 w-full rounded-[3px] border border-hairline bg-sheet px-4 py-3 text-[16px] text-harbor outline-none transition-colors placeholder:text-slate-text/60 focus:border-boxwood";
const label = "block text-[15px] text-harbor";

export function BookingForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(requestConsultationAction, {});

  if (state.sentTo) {
    return (
      <div role="status" className="border-l-2 border-boxwood bg-sheet px-6 py-8 sm:px-8">
        <p className="font-display text-[30px] leading-tight text-harbor">Thank you, {state.sentTo}.</p>
        <p className="mt-3 text-[17px] leading-relaxed text-slate-text">
          Your request is in. We&rsquo;ll be in touch to arrange a walkthrough of the house.
        </p>
      </div>
    );
  }

  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-6 sm:grid-cols-2">
      <label className={label}>
        Your name
        <input name="name" required autoComplete="name" defaultValue={v.name} className={field} />
      </label>
      <label className={label}>
        Email
        <input name="email" type="email" required autoComplete="email" defaultValue={v.email} className={field} />
      </label>
      <label className={label}>
        Phone <span className="text-slate-text">(optional)</span>
        <input name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} className={field} />
      </label>
      <label className={label}>
        Where is the home?
        <input name="location" placeholder="Street or neighborhood" defaultValue={v.location} className={field} />
      </label>
      <label className={label}>
        When will you be away?
        <input name="away" placeholder="For example, December to April" defaultValue={v.away} className={field} />
      </label>
      <label className={label}>
        Plan you&rsquo;re considering
        {/* React resets the form after each submit, and a select only takes its default when it mounts,
            so it's keyed to remount with the plan that was chosen. */}
        <select
          key={v.plan}
          name="plan"
          defaultValue={v.plan || "Not sure yet"}
          className={`${field} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='8'%20fill='none'%3E%3Cpath%20d='M1%201.5l5%205%205-5'%20stroke='%235b6670'%20stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat pr-10`}
        >
          <option>Not sure yet</option>
          <option>Monthly</option>
          <option>Every two weeks</option>
          <option>Weekly</option>
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Anything we should know? <span className="text-slate-text">(optional)</span>
        <textarea
          name="message"
          rows={4}
          placeholder="Alarm, pets, a pool, a contractor due while you’re away…"
          defaultValue={v.message}
          className={field}
        />
      </label>
      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-boxwood px-8 py-3.5 text-[16px] font-medium text-white transition-colors hover:bg-boxwood-deep disabled:opacity-70"
        >
          {pending ? "Sending…" : "Request a consultation"}
        </button>
        {state.error && (
          <p role="alert" className="text-[15px] text-[#9a3b2a]">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
