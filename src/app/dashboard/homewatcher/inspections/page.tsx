import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { inspectionScope, requireCompany } from "@/lib/authz";
import { LocalTime } from "@/components/local-time";
import { OutcomeBadge } from "@/components/inspection-report";

export default async function InspectionsPage() {
  const ctx = await requireCompany();
  const include = {
    home: true,
    inspector: { select: { name: true, email: true } },
    items: { select: { status: true } },
  } as const;
  const [inProgress, completed] = await Promise.all([
    prisma.inspection.findMany({ where: { ...inspectionScope(ctx), status: "draft" }, orderBy: { startedAt: "desc" }, include }),
    prisma.inspection.findMany({
      where: { ...inspectionScope(ctx), status: "submitted" },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include,
    }),
  ]);
  const who = (i: (typeof completed)[number]) => i.inspector?.name ?? i.inspector?.email ?? "Former team member";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[30px] leading-tight sm:text-[34px] text-ink">Inspections</h1>
      <p className="text-sm text-ink-muted">Start a home check from a property&apos;s page.</p>

      {inProgress.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-ink">In progress</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {inProgress.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/dashboard/homewatcher/inspections/${i.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-pending-soft px-4 py-3 shadow-sm"
                >
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold text-ink">{i.home.nickname}</span>
                    <span className="block text-ink-muted">
                      {who(i)} · {i.items.filter((x) => x.status).length} of {i.items.length} checked
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-pending">Continue</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-bold text-ink">Completed</h2>
        {completed.length === 0 ? (
          <div className="mt-2 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center shadow-sm">
            <ClipboardCheck className="h-7 w-7 text-accent" strokeWidth={1.75} />
            <p className="text-sm text-ink-muted">Submitted home-check reports will show up here.</p>
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {completed.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/dashboard/homewatcher/inspections/${i.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:shadow-md"
                >
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold text-ink">{i.home.nickname}</span>
                    <span className="block text-ink-muted">
                      <LocalTime iso={(i.submittedAt ?? i.startedAt).toISOString()} style="date" /> · {who(i)}
                    </span>
                  </span>
                  <OutcomeBadge items={i.items} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
