import Image from "next/image";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { LocalTime } from "./local-time";
import { ReportStatusBadge } from "./report-status-badge";

export type ReportListItem = {
  id: string;
  createdAt: Date;
  notes: string | null;
  photoUrls: string;
  checklistResults: string;
  status: string;
};

export function ReportCard({ report, href }: { report: ReportListItem; href?: string }) {
  const results = JSON.parse(report.checklistResults) as Record<string, boolean>;
  const photoUrls = JSON.parse(report.photoUrls) as string[];
  const checkedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.values(results).length;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          <LocalTime iso={new Date(report.createdAt).toISOString()} />
        </p>
        <ReportStatusBadge status={report.status} />
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
        <ClipboardCheck className="h-3 w-3" strokeWidth={2} />
        {checkedCount}/{totalCount} checked
      </p>
      {report.notes && <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{report.notes}</p>}
      {photoUrls.length > 0 && (
        <div className="mt-3 flex gap-2">
          {photoUrls.slice(0, 4).map((url) => (
            <Image key={url} src={url} alt="Report photo" width={80} height={80} className="h-20 w-20 rounded-xl object-cover" />
          ))}
        </div>
      )}
    </>
  );

  return href ? (
    <Link href={href} className="block rounded-2xl bg-surface p-4 shadow-sm transition hover:shadow-md">
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">{body}</div>
  );
}

export function ReportList({
  reports,
  hrefBase,
}: {
  reports: ReportListItem[];
  hrefBase?: string;
}) {
  if (reports.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">No reports yet.</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} href={hrefBase ? `${hrefBase}/${report.id}` : undefined} />
      ))}
    </div>
  );
}
