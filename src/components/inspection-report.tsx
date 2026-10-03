import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Building2, Check, Minus, TriangleAlert, Wrench } from "lucide-react";
import { LocalTime } from "./local-time";
import { STATUS_LABEL, inspectionOutcome, isItemStatus, type ItemStatus, type OutcomeLevel } from "@/lib/inspection-template";

type ReportMedia = { id: string; kind: string; path: string };
type ReportSource = {
  submittedAt: Date | null;
  startedAt: Date;
  summary: string | null;
  inspector: { name: string | null; email: string } | null;
  company: { name: string; logoUrl: string | null };
  home: { nickname: string; address: string };
  items: {
    id: string;
    label: string;
    status: string | null;
    note: string | null;
    reading: number | null;
    readingUnit: string | null;
    media: ReportMedia[];
  }[];
};

const ITEM_STYLE: Record<ItemStatus, { Icon: LucideIcon; tone: string }> = {
  repair_needed: { Icon: Wrench, tone: "bg-danger/10 text-danger" },
  needs_attention: { Icon: TriangleAlert, tone: "bg-pending-soft text-pending" },
  good: { Icon: Check, tone: "bg-accent-soft text-accent" },
  not_checked: { Icon: Minus, tone: "bg-border text-ink-muted" },
};
const ORDER: ItemStatus[] = ["repair_needed", "needs_attention", "good"];

export const OUTCOME_STYLE: Record<OutcomeLevel, { label: string; tone: string }> = {
  good: { label: "All good", tone: "bg-accent-soft text-accent" },
  attention: { label: "Needs attention", tone: "bg-pending-soft text-pending" },
  repair: { label: "Repair needed", tone: "bg-danger/10 text-danger" },
};

export function OutcomeBadge({ items }: { items: { status: string | null }[] }) {
  const { level } = inspectionOutcome(items);
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${OUTCOME_STYLE[level].tone}`}>
      {OUTCOME_STYLE[level].label}
    </span>
  );
}

const reading = (value: number | null, unit: string | null) =>
  value === null || !unit ? null : `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`;

// A submitted home check as homeowners and staff read it: what's wrong first, then what's fine.
// Media URLs are signed by the caller after its own permission check.
export function InspectionReport({
  inspection,
  mediaUrls,
  branded = false,
  showPlace = true,
}: {
  inspection: ReportSource;
  mediaUrls: Map<string, string>;
  branded?: boolean;
  showPlace?: boolean;
}) {
  const outcome = inspectionOutcome(inspection.items);
  const when = (inspection.submittedAt ?? inspection.startedAt).toISOString();
  const marked = inspection.items.filter((i) => isItemStatus(i.status) && i.status !== "not_checked");
  const ordered = ORDER.flatMap((status) => marked.filter((i) => i.status === status));
  const notChecked = inspection.items.filter((i) => !i.status || i.status === "not_checked");

  return (
    <article>
      {branded && (
        <header className="mb-5 flex items-center gap-3">
          {inspection.company.logoUrl ? (
            <Image
              src={inspection.company.logoUrl}
              alt={`${inspection.company.name} logo`}
              width={44}
              height={44}
              className="h-11 w-11 rounded-2xl object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Building2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
          )}
          <div>
            <p className="font-bold text-ink">{inspection.company.name}</p>
            <p className="text-xs text-ink-muted">Powered by WatchPointPro</p>
          </div>
        </header>
      )}

      {showPlace && (
        <>
          <h1 className="text-2xl font-bold text-ink">{inspection.home.nickname}</h1>
          <p className="text-sm text-ink-muted">{inspection.home.address}</p>
        </>
      )}

      <p className={`${showPlace ? "mt-3" : ""} text-lg font-bold text-ink`}>
        Home checked <LocalTime iso={when} style="relative" />
      </p>
      <p className="text-sm text-ink-muted">
        <LocalTime iso={when} style="longDate" />
        {" · "}Checked by {inspection.inspector?.name ?? inspection.inspector?.email ?? "your home watcher"} —{" "}
        {inspection.company.name}
      </p>

      <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${OUTCOME_STYLE[outcome.level].tone}`}>
        {outcome.sentence}
      </p>

      {inspection.summary && (
        <section className="mt-4 rounded-3xl bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-bold text-ink">Summary</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{inspection.summary}</p>
        </section>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {ordered.map((item) => {
          const status = item.status as ItemStatus;
          const { Icon, tone } = ITEM_STYLE[status];
          const value = reading(item.reading, item.readingUnit);
          const photos = item.media.filter((m) => m.kind === "photo");
          const videos = item.media.filter((m) => m.kind === "video");
          return (
            <li key={item.id} className="rounded-3xl bg-surface p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {item.label}
                    <span className="font-normal text-ink-muted"> — {STATUS_LABEL[status]}</span>
                    {value && <span className="ml-2 font-bold text-ink">{value}</span>}
                  </p>
                  {item.note && <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{item.note}</p>}
                </div>
              </div>
              {photos.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {photos.map((m) => (
                    <li key={m.id}>
                      <a href={mediaUrls.get(m.path)} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrls.get(m.path)} alt={`${item.label} photo`} className="h-24 w-24 rounded-2xl object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {videos.map((m) => (
                <video key={m.id} src={mediaUrls.get(m.path)} controls preload="metadata" className="mt-3 w-full rounded-2xl bg-black" />
              ))}
            </li>
          );
        })}
      </ul>

      {notChecked.length > 0 && (
        <p className="mt-3 text-xs text-ink-muted">Not checked this time: {notChecked.map((i) => i.label).join(", ")}</p>
      )}
    </article>
  );
}
