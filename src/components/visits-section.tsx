import { CalendarDays, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteVisitAction } from "@/lib/actions/visits";
import { LocalTime } from "./local-time";
import { VisitForm } from "./visit-form";

export async function VisitsSection({ homeId }: { homeId: string }) {
  const visits = await prisma.visit.findMany({
    where: { homeId, scheduledFor: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
    orderBy: { scheduledFor: "asc" },
    include: { createdBy: true },
    take: 10,
  });

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-1.5 text-lg font-bold text-ink">
        <CalendarDays className="h-4 w-4 text-accent" strokeWidth={2} />
        Visit schedule
      </h2>
      {visits.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">No upcoming visits.</p>
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
              <form action={deleteVisitAction.bind(null, v.id)}>
                <button aria-label="Cancel visit" className="text-ink-muted hover:text-danger">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <VisitForm homeId={homeId} />
    </div>
  );
}
