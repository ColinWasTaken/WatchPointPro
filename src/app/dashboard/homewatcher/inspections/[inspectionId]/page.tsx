import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { inspectionScope, isAdmin, requireCompany } from "@/lib/authz";
import { signMediaUrls } from "@/lib/media";
import { issueLinksFor } from "@/lib/issue-links";
import { isItemStatus } from "@/lib/inspection-template";
import { BackLink } from "@/components/back-link";
import { LocalTime } from "@/components/local-time";
import { InspectionEditor } from "@/components/inspection-editor";
import { InspectionReport } from "@/components/inspection-report";

export default async function InspectionPage(props: PageProps<"/dashboard/homewatcher/inspections/[inspectionId]">) {
  const { inspectionId } = await props.params;
  const ctx = await requireCompany();
  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, ...inspectionScope(ctx) },
    include: {
      home: true,
      company: true,
      inspector: { select: { name: true, email: true } },
      items: { orderBy: { position: "asc" }, include: { media: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!inspection) notFound();

  const urls = await signMediaUrls(inspection.items.flatMap((i) => i.media.map((m) => m.path)));
  const back = (
    <BackLink href={`/dashboard/homewatcher/properties/${inspection.homeId}`} label={`Back to ${inspection.home.nickname}`} />
  );

  if (inspection.status === "submitted") {
    const issueLinks = await issueLinksFor(inspection, (id) => `/dashboard/homewatcher/issues/${id}`);
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <div className="mt-4">
          <InspectionReport inspection={inspection} mediaUrls={urls} issueLinks={issueLinks} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {back}
      <h1 className="mt-4 text-2xl font-bold text-ink">Home check</h1>
      <p className="text-sm text-ink-muted">{inspection.home.address}</p>
      <p className="mb-2 text-xs text-ink-muted">
        Started <LocalTime iso={inspection.startedAt.toISOString()} style="weekday" /> by{" "}
        {inspection.inspector?.name ?? inspection.inspector?.email ?? "a team member"} · saved automatically as you go
      </p>
      <InspectionEditor
        inspectionId={inspection.id}
        initialSummary={inspection.summary ?? ""}
        canDiscard={isAdmin(ctx) || inspection.inspectorId === ctx.userId}
        initialItems={inspection.items.map((i) => ({
          id: i.id,
          label: i.label,
          status: isItemStatus(i.status) ? i.status : null,
          note: i.note ?? "",
          reading: i.reading === null ? "" : String(i.reading),
          readingUnit: i.readingUnit,
          media: i.media.map((m) => ({ id: m.id, kind: m.kind === "video" ? "video" : "photo", url: urls.get(m.path) ?? "" })),
        }))}
      />
    </div>
  );
}
