import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/back-link";
import { ReportList } from "@/components/report-list";

export default async function ReportHistoryPage(
  props: PageProps<"/dashboard/homewatcher/homes/[homeId]/reports">,
) {
  const { homeId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const assignment = await prisma.homeAssignment.findUnique({
    where: { homeId_homewatcherId: { homeId, homewatcherId: session.user.id } },
    include: { home: true },
  });
  if (!assignment || assignment.status !== "accepted") notFound();
  const home = assignment.home;

  const reports = await prisma.report.findMany({
    where: { homeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homewatcher/homes/${homeId}`} label={`Back to ${home.nickname}`} />
      <h1 className="mt-4 text-2xl font-bold text-ink">All reports</h1>
      <p className="text-sm text-ink-muted">{reports.length} total</p>
      <ReportList reports={reports} hrefBase={`/dashboard/homewatcher/homes/${homeId}/reports`} />
    </div>
  );
}
