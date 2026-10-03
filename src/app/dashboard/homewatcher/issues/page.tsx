import Link from "next/link";
import { CircleCheckBig } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { issueScope, requireCompany } from "@/lib/authz";
import { UNRESOLVED } from "@/lib/issues";
import { IssueList } from "@/components/issue-list";

const chip = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
    active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white"
  }`;

export default async function IssuesPage(props: PageProps<"/dashboard/homewatcher/issues">) {
  const ctx = await requireCompany();
  const { show } = await props.searchParams;
  const resolved = show === "resolved";

  const [issues, openCount] = await Promise.all([
    prisma.issue.findMany({
      where: { ...issueScope(ctx), status: resolved ? "resolved" : UNRESOLVED },
      orderBy: resolved ? [{ resolvedAt: "desc" }] : [{ severity: "desc" }, { createdAt: "desc" }],
      include: { home: true },
      take: 100,
    }),
    prisma.issue.count({ where: { ...issueScope(ctx), status: UNRESOLVED } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Issues</h1>
      <p className="text-sm text-ink-muted">Problems found during home checks, tracked until they&apos;re resolved.</p>
      <div className="mt-4 flex gap-2">
        <Link href="/dashboard/homewatcher/issues" className={chip(!resolved)}>
          Open ({openCount})
        </Link>
        <Link href="/dashboard/homewatcher/issues?show=resolved" className={chip(resolved)}>
          Resolved
        </Link>
      </div>
      <div className="mt-4">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center shadow-sm">
            <CircleCheckBig className="h-7 w-7 text-accent" strokeWidth={1.75} />
            <p className="text-sm text-ink-muted">
              {resolved
                ? "Resolved issues will show up here."
                : "No open issues. Items marked Needs attention or Repair needed in a home check show up here."}
            </p>
          </div>
        ) : (
          <IssueList issues={issues} hrefFor={(id) => `/dashboard/homewatcher/issues/${id}`} />
        )}
      </div>
    </div>
  );
}
