import type { ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { LocalTime } from "./local-time";
import { IssueStatusBadge, SeverityIcon } from "./issue-list";
import { ISSUE_STATUS_LABEL, SEVERITY_LABEL, isIssueStatus } from "@/lib/issues";

export type IssueWithHistory = Prisma.IssueGetPayload<{
  include: {
    home: true;
    item: { include: { media: true } };
    events: { include: { author: { select: { name: true; email: true } } } };
  };
}>;

const describe = (e: IssueWithHistory["events"][number]) => {
  const who = e.author?.name ?? e.author?.email ?? "Someone";
  if (e.kind === "reported") return `Reported by ${who} during a home check`;
  if (e.kind === "seen_again") return `Seen again by ${who} during a home check`;
  if (e.kind === "status" && isIssueStatus(e.status)) return `${who} marked it ${ISSUE_STATUS_LABEL[e.status].toLowerCase()}`;
  return `${who} added a note`;
};

// One issue: what was found (with the inspector's photos), its status, and its full history.
// Media URLs are signed by the caller after its own permission check.
export function IssueDetail({
  issue,
  mediaUrls,
  reportHrefFor,
  form,
  findPros,
}: {
  issue: IssueWithHistory;
  mediaUrls: Map<string, string>;
  reportHrefFor: (inspectionId: string) => string;
  form: ReactNode;
  findPros?: { href: string; label: string };
}) {
  const media = issue.item?.media ?? [];
  const events = [...issue.events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <article>
      <div className="flex items-center gap-2">
        <SeverityIcon severity={issue.severity} />
        <span className="text-xs font-semibold text-ink-muted">{SEVERITY_LABEL[issue.severity] ?? issue.severity}</span>
        <IssueStatusBadge status={issue.status} />
      </div>
      <h1 className="mt-2 text-[30px] leading-tight sm:text-[34px] text-ink">{issue.title}</h1>
      <p className="text-sm text-ink-muted">{issue.home.address}</p>
      <p className="mt-1 text-sm text-ink-muted">
        Reported <LocalTime iso={issue.createdAt.toISOString()} style="longDate" />
        {issue.inspectionId && (
          <>
            {" · "}
            <Link href={reportHrefFor(issue.inspectionId)} className="font-semibold text-accent">
              View the home check
            </Link>
          </>
        )}
      </p>

      {issue.description && (
        <p className="mt-4 whitespace-pre-wrap rounded-3xl bg-surface p-4 text-sm text-ink shadow-sm">{issue.description}</p>
      )}

      {media.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {media.map((m) =>
            m.kind === "video" ? (
              <video key={m.id} src={mediaUrls.get(m.path)} controls preload="metadata" className="w-full rounded-2xl bg-black" />
            ) : (
              <a key={m.id} href={mediaUrls.get(m.path)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrls.get(m.path)} alt={`${issue.title} photo`} className="h-24 w-24 rounded-2xl object-cover" />
              </a>
            ),
          )}
        </div>
      )}

      {findPros && issue.status !== "resolved" && (
        <Link
          href={findPros.href}
          className="mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-accent-soft text-sm font-bold text-accent transition-colors hover:bg-accent hover:text-white"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} /> {findPros.label}
        </Link>
      )}

      <div className="mt-6">{form}</div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">History</h2>
        <ol className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
              <p className="text-sm font-semibold text-ink">
                {describe(e)}
                {e.inspectionId && (e.kind === "reported" || e.kind === "seen_again") && (
                  <>
                    {" · "}
                    <Link href={reportHrefFor(e.inspectionId)} className="text-accent">
                      report
                    </Link>
                  </>
                )}
              </p>
              {e.note && <p className="whitespace-pre-wrap text-sm text-ink">{e.note}</p>}
              <p className="text-xs text-ink-muted">
                <LocalTime iso={e.createdAt.toISOString()} />
              </p>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
