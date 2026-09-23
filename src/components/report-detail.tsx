import Image from "next/image";
import { CheckSquare, Square } from "lucide-react";
import { LocalTime } from "./local-time";
import { ReportStatusBadge } from "./report-status-badge";

type Report = {
  createdAt: Date;
  notes: string | null;
  photoUrls: string;
  checklistResults: string;
  status: string;
};

export function ReportDetail({
  report,
  items,
  watcherName,
}: {
  report: Report;
  items: { id: string; label: string }[];
  watcherName: string;
}) {
  const results = JSON.parse(report.checklistResults) as Record<string, boolean>;
  const photoUrls = JSON.parse(report.photoUrls) as string[];
  const known = items.filter((i) => i.id in results);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="rounded-3xl bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-ink">
              <LocalTime iso={new Date(report.createdAt).toISOString()} />
            </p>
            <p className="text-sm text-ink-muted">Reported by {watcherName}</p>
          </div>
          <ReportStatusBadge status={report.status} />
        </div>
        {report.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{report.notes}</p>}
      </div>

      <div className="rounded-3xl bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink">Checklist</h2>
        {known.length === 0 ? (
          <p className="text-sm text-ink-muted">No checklist items were recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {known.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                {results[item.id] ? (
                  <CheckSquare className="h-4 w-4 text-accent" strokeWidth={2} />
                ) : (
                  <Square className="h-4 w-4 text-ink-muted" strokeWidth={2} />
                )}
                <span className={results[item.id] ? "text-ink" : "text-ink-muted"}>{item.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {photoUrls.length > 0 && (
        <div className="rounded-3xl bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-ink">Photos</h2>
          <div className="grid grid-cols-2 gap-3">
            {photoUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <Image src={url} alt="Report photo" width={400} height={300} className="h-36 w-full rounded-2xl object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
