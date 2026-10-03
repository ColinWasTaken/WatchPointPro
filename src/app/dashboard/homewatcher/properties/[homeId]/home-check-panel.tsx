import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { startInspectionAction } from "@/lib/actions/inspections";
import { LocalTime } from "@/components/local-time";
import { OutcomeBadge } from "@/components/inspection-report";
import { PendingButton } from "@/components/pending-button";
import { IssueList } from "@/components/issue-list";
import { UNRESOLVED } from "@/lib/issues";

const bigButton =
  "flex min-h-[64px] w-full items-center justify-center gap-2 rounded-full bg-accent text-lg font-bold tracking-wide text-white shadow-sm transition-colors hover:bg-accent-strong disabled:opacity-60";

// The property's main action, Start (or Continue) Home Check, plus its recent reports.
export async function HomeCheckPanel({ homeId }: { homeId: string }) {
  const [draft, recent, issues] = await Promise.all([
    prisma.inspection.findFirst({
      where: { homeId, status: "draft" },
      orderBy: { startedAt: "asc" },
      include: { inspector: { select: { name: true, email: true } }, items: { select: { status: true } } },
    }),
    prisma.inspection.findMany({
      where: { homeId, status: "submitted" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: { inspector: { select: { name: true, email: true } }, items: { select: { status: true } } },
    }),
    prisma.issue.findMany({
      where: { homeId, status: UNRESOLVED },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <section className="mt-6">
      {draft ? (
        <>
          <Link href={`/dashboard/homewatcher/inspections/${draft.id}`} className={bigButton}>
            <ClipboardCheck className="h-6 w-6" strokeWidth={2} /> CONTINUE HOME CHECK
          </Link>
          <p className="mt-2 text-center text-xs text-ink-muted">
            Started by {draft.inspector?.name ?? draft.inspector?.email ?? "a team member"}{" "}
            <LocalTime iso={draft.startedAt.toISOString()} style="weekday" /> ·{" "}
            {draft.items.filter((i) => i.status).length} of {draft.items.length} checked
          </p>
        </>
      ) : (
        <form action={startInspectionAction.bind(null, homeId)}>
          <PendingButton pendingLabel="Starting…" className={bigButton}>
            <ClipboardCheck className="h-6 w-6" strokeWidth={2} /> Start home check
          </PendingButton>
        </form>
      )}

      {issues.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink">Open issues</h2>
          <div className="mt-2">
            <IssueList issues={issues} hrefFor={(id) => `/dashboard/homewatcher/issues/${id}`} />
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink">Recent checks</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {recent.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/dashboard/homewatcher/inspections/${i.id}`}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:shadow-md"
                >
                  <span className="text-sm">
                    <span className="font-semibold text-ink">
                      <LocalTime iso={(i.submittedAt ?? i.startedAt).toISOString()} style="date" />
                    </span>
                    <span className="text-ink-muted"> · {i.inspector?.name ?? i.inspector?.email ?? "Former team member"}</span>
                  </span>
                  <OutcomeBadge items={i.items} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
