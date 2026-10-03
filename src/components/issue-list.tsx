import Link from "next/link";
import { TriangleAlert, Wrench } from "lucide-react";
import { LocalTime } from "./local-time";
import { ISSUE_STATUS_LABEL, ISSUE_STATUS_TONE, isIssueStatus } from "@/lib/issues";

export function IssueStatusBadge({ status }: { status: string }) {
  if (!isIssueStatus(status)) return null;
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ISSUE_STATUS_TONE[status]}`}>
      {ISSUE_STATUS_LABEL[status]}
    </span>
  );
}

export function SeverityIcon({ severity }: { severity: string }) {
  const repair = severity === "repair";
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${repair ? "bg-danger/10 text-danger" : "bg-pending-soft text-pending"}`}
      title={repair ? "Repair needed" : "Needs attention"}
    >
      {repair ? <Wrench className="h-3.5 w-3.5" strokeWidth={2.5} /> : <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2.5} />}
    </span>
  );
}

type ListIssue = { id: string; title: string; status: string; severity: string; createdAt: Date; home?: { nickname: string } };

export function IssueList({ issues, hrefFor }: { issues: ListIssue[]; hrefFor: (issueId: string) => string }) {
  return (
    <ul className="flex flex-col gap-2">
      {issues.map((i) => (
        <li key={i.id}>
          <Link
            href={hrefFor(i.id)}
            className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:shadow-md"
          >
            <span className="flex min-w-0 items-center gap-3">
              <SeverityIcon severity={i.severity} />
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{i.title}</span>
                <span className="block text-xs text-ink-muted">
                  {i.home ? `${i.home.nickname} · ` : ""}Reported <LocalTime iso={i.createdAt.toISOString()} style="date" />
                </span>
              </span>
            </span>
            <IssueStatusBadge status={i.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
