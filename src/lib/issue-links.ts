import { prisma } from "@/lib/prisma";

// For a report: the issue each problem item opened or updated, keyed by checklist key.
export async function issueLinksFor(inspection: { id: string; homeId: string }, hrefFor: (issueId: string) => string) {
  const issues = await prisma.issue.findMany({
    where: { homeId: inspection.homeId, events: { some: { inspectionId: inspection.id } } },
    select: { id: true, itemKey: true, status: true },
  });
  return new Map(issues.map((i) => [i.itemKey, { href: hrefFor(i.id), status: i.status }]));
}
