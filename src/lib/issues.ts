import type { Prisma } from "@prisma/client";

// Issues: problems found during home checks, tracked until resolved by the company and the
// homeowner together.

export const ISSUE_STATUSES = ["open", "repair_scheduled", "in_progress", "resolved"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const isIssueStatus = (value: unknown): value is IssueStatus =>
  typeof value === "string" && (ISSUE_STATUSES as readonly string[]).includes(value);

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  repair_scheduled: "Repair scheduled",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const ISSUE_STATUS_TONE: Record<IssueStatus, string> = {
  open: "bg-danger/10 text-danger",
  repair_scheduled: "bg-pending-soft text-pending",
  in_progress: "bg-pending-soft text-pending",
  resolved: "bg-accent-soft text-accent",
};

export const SEVERITY_LABEL: Record<string, string> = { repair: "Repair needed", attention: "Needs attention" };

export const UNRESOLVED = { not: "resolved" } as const;

const PROBLEM: Record<string, "attention" | "repair"> = { needs_attention: "attention", repair_needed: "repair" };

// Turns a submitted check's problem items into issues. If the same problem is still open from an
// earlier check, that issue gets a "seen again" entry (and is escalated to repair if needed)
// instead of a duplicate. Runs inside the submit transaction.
export async function recordIssues(
  tx: Prisma.TransactionClient,
  inspection: {
    id: string;
    companyId: string;
    homeId: string;
    items: { id: string; key: string; label: string; status: string | null; note: string | null }[];
  },
  authorId: string,
) {
  for (const item of inspection.items) {
    const severity = item.status ? PROBLEM[item.status] : undefined;
    if (!severity) continue;

    const open = await tx.issue.findFirst({
      where: { homeId: inspection.homeId, itemKey: item.key, status: UNRESOLVED },
      orderBy: { createdAt: "desc" },
    });
    if (open) {
      await tx.issue.update({
        where: { id: open.id },
        data: {
          severity: open.severity === "repair" ? "repair" : severity,
          description: open.description ?? item.note,
        },
      });
      await tx.issueEvent.create({
        data: { issueId: open.id, kind: "seen_again", note: item.note, inspectionId: inspection.id, authorId },
      });
    } else {
      await tx.issue.create({
        data: {
          companyId: inspection.companyId,
          homeId: inspection.homeId,
          inspectionId: inspection.id,
          itemId: item.id,
          itemKey: item.key,
          title: item.label,
          description: item.note,
          severity,
          events: { create: { kind: "reported", note: item.note, inspectionId: inspection.id, authorId } },
        },
      });
    }
  }
}
