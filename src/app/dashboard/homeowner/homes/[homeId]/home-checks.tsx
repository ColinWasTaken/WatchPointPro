import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { signMediaUrls } from "@/lib/media";
import { issueLinksFor } from "@/lib/issue-links";
import { contractorSearchAvailable, tradeForItem } from "@/lib/contractors";
import { LocalTime } from "@/components/local-time";
import { InspectionReport, OutcomeBadge } from "@/components/inspection-report";
import { IssueList } from "@/components/issue-list";

// For a company-managed home: the latest check's results in full, then earlier checks.
export async function HomeChecks({ homeId, companyName }: { homeId: string; companyName: string }) {
  const issues = await prisma.issue.findMany({
    where: { homeId },
    orderBy: [{ resolvedAt: { sort: "desc", nulls: "first" } }, { severity: "desc" }, { createdAt: "desc" }],
    take: 30,
  });
  const openIssues = issues.filter((i) => i.status !== "resolved");
  const pastIssues = issues.filter((i) => i.status === "resolved").slice(0, 10);
  const issueHref = (id: string) => `/dashboard/homeowner/homes/${homeId}/issues/${id}`;
  const issueSections = (
    <>
      {openIssues.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink">Open issues</h2>
          <p className="text-sm text-ink-muted">Track repairs here with {companyName} until each one is resolved.</p>
          <div className="mt-2">
            <IssueList issues={openIssues} hrefFor={issueHref} />
          </div>
        </section>
      )}
      {pastIssues.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-accent">Resolved issues ({pastIssues.length})</summary>
          <div className="mt-2">
            <IssueList issues={pastIssues} hrefFor={issueHref} />
          </div>
        </details>
      )}
    </>
  );

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
      <>
      {issueSections}
      <section className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center shadow-sm">
        <ClipboardCheck className="h-7 w-7 text-accent" strokeWidth={1.75} />
        <p className="text-sm text-ink-muted">
          No home checks yet. {companyName}&apos;s reports will appear here after each visit.
        </p>
      </section>
      </>
    );
  }

  const [latest, ...earlier] = checks;
  const urls = await signMediaUrls(latest.items.flatMap((i) => i.media.map((m) => m.path)));
  const base = `/dashboard/homeowner/homes/${homeId}/inspections`;
  const issueLinks = await issueLinksFor(latest, (id) => `/dashboard/homeowner/homes/${homeId}/issues/${id}`);
  const proLinkFor = contractorSearchAvailable()
    ? (itemKey: string, itemName: string) => {
        const trade = tradeForItem(itemKey, itemName);
        return { href: `/dashboard/homeowner/homes/${homeId}/pros?trade=${trade.key}`, label: `Find ${trade.plural} near my property` };
      }
    : undefined;

  return (
    <>
      {issueSections}
      <section className="mt-8">
        <InspectionReport inspection={latest} mediaUrls={urls} showPlace={false} issueLinks={issueLinks} proLinkFor={proLinkFor} />
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
