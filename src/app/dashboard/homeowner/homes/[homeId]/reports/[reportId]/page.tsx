import { notFound, redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/back-link";
import { ConfirmButton } from "@/components/confirm-button";
import { ReportDetail } from "@/components/report-detail";
import { deleteReportAction } from "@/lib/actions/reports";

export default async function ReportDetailPage(
  props: PageProps<"/dashboard/homeowner/homes/[homeId]/reports/[reportId]">,
) {
  const { homeId, reportId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home || home.ownerId !== session.user.id) notFound();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { homewatcher: true },
  });
  if (!report || report.homeId !== homeId) notFound();

  const items = await prisma.checklistItem.findMany({ where: { homeId }, orderBy: { order: "asc" } });
  const canDelete = report.homewatcherId === session.user.id;

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homeowner/homes/${homeId}/reports`} label="All reports" />
      <h1 className="mt-4 text-2xl font-bold text-ink">{home.nickname}</h1>
      <ReportDetail report={report} items={items} watcherName={report.homewatcher.name ?? report.homewatcher.email} />
      {canDelete && (
        <form action={deleteReportAction.bind(null, report.id)} className="mt-6">
          <ConfirmButton
            message="Delete this report and its photos? This can't be undone."
            className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-danger"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            Delete this report
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
