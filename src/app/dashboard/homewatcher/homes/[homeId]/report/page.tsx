import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/back-link";
import { ReportForm } from "./report-form";

export default async function SubmitReportPage(
  props: PageProps<"/dashboard/homewatcher/homes/[homeId]/report">,
) {
  const { homeId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const assignment = await prisma.homeAssignment.findUnique({
    where: { homeId_homewatcherId: { homeId, homewatcherId: session.user.id } },
    include: { home: true },
  });

  if (!assignment || assignment.status !== "accepted") {
    notFound();
  }

  const items = await prisma.checklistItem.findMany({
    where: { homeId },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg">
      <BackLink
        href={`/dashboard/homewatcher/homes/${homeId}`}
        label={`Back to ${assignment.home.nickname}`}
      />
      <h1 className="mt-4 text-2xl font-bold text-ink">Submit report</h1>
      <ReportForm homeId={homeId} items={items} />
    </div>
  );
}
