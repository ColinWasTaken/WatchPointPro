import { CheckCircle2, TriangleAlert, Siren } from "lucide-react";
import { REPORT_STATUS_LABEL, parseReportStatus } from "@/lib/report-status";

export function ReportStatusBadge({ status }: { status: string }) {
  const s = parseReportStatus(status);
  const style =
    s === "ok"
      ? "bg-accent-soft text-accent"
      : s === "attention"
        ? "bg-pending-soft text-pending"
        : "bg-danger/15 text-danger";
  const Icon = s === "ok" ? CheckCircle2 : s === "attention" ? TriangleAlert : Siren;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {REPORT_STATUS_LABEL[s]}
    </span>
  );
}
