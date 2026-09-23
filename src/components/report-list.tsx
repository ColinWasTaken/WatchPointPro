import Image from "next/image";
import { ClipboardCheck } from "lucide-react";

type ReportListItem = {
  id: string;
  createdAt: Date;
  notes: string | null;
  photoUrls: string;
  checklistResults: string;
};

export function ReportCard({ report }: { report: ReportListItem }) {
  const results = JSON.parse(report.checklistResults) as Record<string, boolean>;
  const photoUrls = JSON.parse(report.photoUrls) as string[];
  const checkedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.values(results).length;

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">
          {new Date(report.createdAt).toLocaleString()}
        </p>
        <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          <ClipboardCheck className="h-3 w-3" strokeWidth={2} />
          {checkedCount}/{totalCount} checked
        </span>
      </div>
      {report.notes && (
        <p className="mt-2 text-sm text-ink-muted">{report.notes}</p>
      )}
      {photoUrls.length > 0 && (
        <div className="mt-3 flex gap-2">
          {photoUrls.map((url) => (
            <Image
              key={url}
              src={url}
              alt="Report photo"
              width={80}
              height={80}
              className="h-20 w-20 rounded-xl object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportList({ reports }: { reports: ReportListItem[] }) {
  if (reports.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">No reports yet.</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}
