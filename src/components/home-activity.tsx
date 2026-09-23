import { CalendarDays, Clock } from "lucide-react";
import { LocalTime } from "./local-time";
import { ReportStatusBadge } from "./report-status-badge";

export function HomeActivity({
  lastReport,
  nextVisit,
}: {
  lastReport: { createdAt: Date; status: string } | null;
  nextVisit: Date | null;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1 text-xs text-ink-muted">
      <p className="flex flex-wrap items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
        {lastReport ? (
          <>
            Last checked <LocalTime iso={lastReport.createdAt.toISOString()} style="date" />
            {lastReport.status !== "ok" && <ReportStatusBadge status={lastReport.status} />}
          </>
        ) : (
          "Not checked yet"
        )}
      </p>
      {nextVisit && (
        <p className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
          Next visit <LocalTime iso={nextVisit.toISOString()} style="weekday" />
        </p>
      )}
    </div>
  );
}
