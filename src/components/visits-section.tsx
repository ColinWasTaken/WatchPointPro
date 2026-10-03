import { CalendarDays, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteVisitAction } from "@/lib/actions/visits";
import { LocalTime } from "./local-time";
import { VisitForm } from "./visit-form";

const RECENT_MS = 2 * 60 * 60 * 1000;

// Upcoming visits, plus ones from the last two hours so a visit in progress still shows.
function currentVisits(homeId: string) {
  return prisma.visit.findMany({
    where: { homeId, scheduledFor: { gte: new Date(Date.now() - RECENT_MS) } },
    orderBy: { scheduledFor: "asc" },
    include: { createdBy: true },
    take: 10,
  });
}

export async function VisitsSection({
  homeId,
  title = "Visit schedule",
  submitLabel,
  canCancel = () => true,
}: {
  homeId: string;
  title?: string;
  submitLabel?: string;
  // Which visits to show a cancel button for; the action enforces the same rule.
  canCancel?: (visit: { createdById: string }) => boolean;
}) {
  const visits = await currentVisits(homeId);

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-1.5 text-lg font-bold text-ink">
        <CalendarDays className="h-4 w-4 text-accent" strokeWidth={2} />
        {title}
      </h2>
      {visits.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Nothing scheduled.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {visits.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-ink">
                  <LocalTime iso={v.scheduledFor.toISOString()} style="weekday" />
                </p>
                <p className="text-xs text-ink-muted">
                  {v.note ? `${v.note} · ` : ""}added by {v.createdBy.name ?? v.createdBy.email}
                </p>
              </div>
              {canCancel(v) && (
                <form action={deleteVisitAction.bind(null, v.id)}>
                  <button aria-label="Cancel visit" className="text-ink-muted hover:text-danger">
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <VisitForm homeId={homeId} submitLabel={submitLabel} />
    </div>
  );
}
