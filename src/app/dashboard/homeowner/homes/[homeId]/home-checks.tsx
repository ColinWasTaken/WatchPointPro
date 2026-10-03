import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { signMediaUrls } from "@/lib/media";
import { LocalTime } from "@/components/local-time";
import { InspectionReport, OutcomeBadge } from "@/components/inspection-report";

// For a company-managed home: the latest check's results in full, then earlier checks.
export async function HomeChecks({ homeId, companyName }: { homeId: string; companyName: string }) {
  const checks = await prisma.inspection.findMany({
    where: { homeId, status: "submitted" },
    orderBy: { submittedAt: "desc" },
    take: 25,
    include: {
      home: true,
      company: true,
      inspector: { select: { name: true, email: true } },
      items: { orderBy: { position: "asc" }, include: { media: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (checks.length === 0) {
    return (
      <section className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center shadow-sm">
        <ClipboardCheck className="h-7 w-7 text-accent" strokeWidth={1.75} />
        <p className="text-sm text-ink-muted">
          No home checks yet. {companyName}&apos;s reports will appear here after each visit.
        </p>
      </section>
    );
  }

  const [latest, ...earlier] = checks;
  const urls = await signMediaUrls(latest.items.flatMap((i) => i.media.map((m) => m.path)));
  const base = `/dashboard/homeowner/homes/${homeId}/inspections`;

  return (
    <>
      <section className="mt-8">
        <InspectionReport inspection={latest} mediaUrls={urls} showPlace={false} />
        <Link href={`${base}/${latest.id}`} className="mt-3 inline-block text-sm font-semibold text-accent">
          Open this report
        </Link>
      </section>

      {earlier.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink">Earlier checks</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {earlier.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${base}/${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:shadow-md"
                >
                  <span className="text-sm">
                    <span className="font-semibold text-ink">
                      <LocalTime iso={(c.submittedAt ?? c.startedAt).toISOString()} style="date" />
                    </span>
                    <span className="text-ink-muted"> · {c.inspector?.name ?? c.inspector?.email ?? companyName}</span>
                  </span>
                  <OutcomeBadge items={c.items} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
