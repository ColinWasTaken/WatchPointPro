export const REPORT_STATUSES = ["ok", "attention", "urgent"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  ok: "All good",
  attention: "Needs attention",
  urgent: "Urgent",
};

export function parseReportStatus(value: unknown): ReportStatus {
  return REPORT_STATUSES.includes(value as ReportStatus) ? (value as ReportStatus) : "ok";
}
