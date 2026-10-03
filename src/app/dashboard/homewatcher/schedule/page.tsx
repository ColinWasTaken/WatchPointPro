import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LocalTime } from "@/components/local-time";
import { getCompanyContext, isAdmin, propertyScope } from "@/lib/authz";

const STALE_DAYS = 7;

export default async function SchedulePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = new Date();
  const assignments = await prisma.homeAssignment.findMany({
    where: { homewatcherId: session.user.id, status: "accepted" },
    include: { home: { include: { reports: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  const homeIds = assignments.map((a) => a.homeId);
  const ctx = await getCompanyContext(session.user.id);
  const showAssignee = ctx ? isAdmin(ctx) : false;

  // Independent homes they watch, plus company properties they can see.
  const visits = await prisma.visit.findMany({
    where: {
      scheduledFor: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      OR: [{ homeId: { in: homeIds } }, ...(ctx ? [{ home: propertyScope(ctx) }] : [])],
    },
    orderBy: { scheduledFor: "asc" },
    include: { home: { include: { assignedEmployee: { select: { name: true, email: true } } } } },
    take: 50,
  });

  const cutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const needsCheck = assignments
    .map((a) => a.home)
    .filter((h) => !h.reports[0] || h.reports[0].createdAt < cutoff);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[30px] leading-tight sm:text-[34px] text-ink">Schedule</h1>

      <h2 className="mt-6 flex items-center gap-1.5 text-lg font-bold text-ink">
        <CalendarDays className="h-4 w-4 text-accent" strokeWidth={2} />
        {ctx ? "Upcoming checks" : "Upcoming visits"}
      </h2>
      {visits.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          {ctx ? "Nothing scheduled. Schedule checks from a property's page." : "Nothing scheduled. Add visits from a home's page."}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {visits.map((v) => (
            <li key={v.id}>
              <Link
                href={`/dashboard/homewatcher/${v.home.companyId ? "properties" : "homes"}/${v.homeId}`}
                className="block rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:shadow-md"
              >
                <p className="text-sm font-semibold text-ink">
                  <LocalTime iso={v.scheduledFor.toISOString()} style="weekday" />
                </p>
                <p className="text-sm text-ink">{v.home.nickname}</p>
                <p className="text-xs text-ink-muted">
                  {[
                    v.home.address,
                    showAssignee && v.home.companyId && (v.home.assignedEmployee?.name ?? v.home.assignedEmployee?.email ?? "Unassigned"),
                    v.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(!ctx || assignments.length > 0) && (
      <>
      <h2 className="mt-8 flex items-center gap-1.5 text-lg font-bold text-ink">
        <TriangleAlert className="h-4 w-4 text-pending" strokeWidth={2} />
        Due for a check
      </h2>
      <p className="text-sm text-ink-muted">No report in the last {STALE_DAYS} days.</p>
      {needsCheck.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">All caught up.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {needsCheck.map((h) => (
            <li key={h.id}>
              <Link href={`/dashboard/homewatcher/homes/${h.id}`} className="block rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:shadow-md">
                <p className="text-sm font-semibold text-ink">{h.nickname}</p>
                <p className="text-xs text-ink-muted">
                  {h.address} ·{" "}
                  {h.reports[0] ? (
                    <>last checked <LocalTime iso={h.reports[0].createdAt.toISOString()} style="date" /></>
                  ) : (
                    "never checked"
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </>
      )}
    </div>
  );
}
