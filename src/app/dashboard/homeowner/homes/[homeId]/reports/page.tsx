import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/back-link";
import { ReportList } from "@/components/report-list";

export default async function ReportHistoryPage(
  props: PageProps<"/dashboard/homeowner/homes/[homeId]/reports">,
) {
  const { homeId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home || home.ownerId !== session.user.id) notFound();

  const reports = await prisma.report.findMany({
    where: { homeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homeowner/homes/${homeId}`} label={`Back to ${home.nickname}`} />
      <h1 className="mt-4 text-2xl font-bold text-ink">All reports</h1>
      <p className="text-sm text-ink-muted">{reports.length} total</p>
      <ReportList reports={reports} hrefBase={`/dashboard/homeowner/homes/${homeId}/reports`} />
    </div>
  );
}
