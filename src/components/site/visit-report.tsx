import Image from "next/image";
import { Check, TriangleAlert } from "lucide-react";
import { BUSINESS, PHOTOS } from "./content";

const CHECKS: { label: string; note?: string }[] = [
  { label: "Air conditioning" },
  { label: "Plumbing and water" },
  { label: "Doors and windows" },
  { label: "Appliances" },
  { label: "Pool and equipment" },
  { label: "Signs of pests" },
  { label: "Roof and exterior", note: "One loose ridge tile above the garage. We’ve asked a roofer for a quote and will send it to you today." },
];

// A sample of the report homeowners receive after each visit, typeset like the real thing.
export function VisitReportSpecimen() {
  return (
    <figure className="m-0">
      <div className="bg-sheet px-6 py-8 shadow-[0_1px_2px_rgba(29,43,54,0.06),0_24px_48px_-24px_rgba(29,43,54,0.28)] sm:px-10 sm:py-10">
        <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-5">
          <span className="font-display text-[19px] text-harbor">{BUSINESS.name}</span>
          <span className="text-[13px] text-slate-text">Visit report</span>
        </div>

        <div className="pt-6">
          <p className="font-display text-[28px] leading-tight text-harbor">14 Hillcrest Lane</p>
          <p className="mt-1 text-[15px] text-slate-text">Tuesday, March 11, from 9:00 to 9:50 in the morning</p>
          <p className="text-[15px] text-slate-text">Visited by Daniel</p>
        </div>

        <p className="mt-6 border-l-2 border-boxwood bg-mist/60 px-4 py-3 text-[16px] leading-snug text-harbor">
          Everything looks good except one item that needs attention.
        </p>

        <dl className="mt-7 grid grid-cols-2 gap-6 border-y border-hairline py-6">
          <div>
            <dt className="text-[13px] text-slate-text">Indoor temperature</dt>
            <dd className="m-0 font-display text-[40px] leading-none text-harbor">
              76<span className="ml-0.5 font-site text-[18px] text-slate-text">°F</span>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-slate-text">Humidity</dt>
            <dd className="m-0 font-display text-[40px] leading-none text-harbor">
              48<span className="ml-0.5 font-site text-[18px] text-slate-text">%</span>
            </dd>
          </div>
        </dl>

        <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {CHECKS.map((c) =>
            c.note ? (
              <li key={c.label} className="flex gap-2.5 sm:col-span-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6420]" strokeWidth={2.25} aria-label="Needs attention" />
                <span className="text-[15px] leading-snug text-harbor">
                  {c.label}
                  <span className="mt-1 block text-[14px] text-slate-text">{c.note}</span>
                </span>
              </li>
            ) : (
              <li key={c.label} className="flex gap-2.5 text-[15px] text-harbor">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-boxwood" strokeWidth={2.5} aria-label="Good" />
                {c.label}
              </li>
            ),
          )}
        </ul>

        <div className="mt-7 flex items-center gap-4 border-t border-hairline pt-6">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-mist sm:h-24 sm:w-24">
            <Image src={PHOTOS.entrance.src} alt={PHOTOS.entrance.alt} fill sizes="96px" className="object-cover" />
          </div>
          <p className="text-[14px] leading-snug text-slate-text">Front entrance, locked and checked twice. Mail and one parcel brought inside.</p>
        </div>

        <blockquote className="m-0 mt-7 border-t border-hairline pt-6">
          <p className="font-caslon text-[17px] italic leading-relaxed text-harbor">
            Quiet visit. Plants watered, taps run, and the AC is holding steady. I&rsquo;ll look at the ridge tile again next
            Tuesday.
          </p>
          <footer className="mt-2 text-[14px] text-slate-text">Daniel</footer>
        </blockquote>
      </div>
      <figcaption className="mt-4 text-[14px] text-slate-text">
        A sample report. Yours arrives by email and stays in your client account.
      </figcaption>
    </figure>
  );
}
