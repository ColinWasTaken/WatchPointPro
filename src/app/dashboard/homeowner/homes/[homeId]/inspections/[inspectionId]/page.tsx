import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { signMediaUrls } from "@/lib/media";
import { issueLinksFor } from "@/lib/issue-links";
import { contractorSearchAvailable, tradeForItem } from "@/lib/contractors";
import { BackLink } from "@/components/back-link";
import { InspectionReport } from "@/components/inspection-report";

export default async function HomeownerInspectionPage(
  props: PageProps<"/dashboard/homeowner/homes/[homeId]/inspections/[inspectionId]">,
) {
  const { homeId, inspectionId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  // Only submitted checks of a home this homeowner owns.
  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, homeId, status: "submitted", home: { ownerId: session.user.id } },
    include: {
      home: true,
      company: true,
      inspector: { select: { name: true, email: true } },
      items: { orderBy: { position: "asc" }, include: { media: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!inspection) notFound();

  // Opening the report counts as reading its notification.
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null, link: `/dashboard/homeowner/homes/${homeId}/inspections/${inspectionId}` },
    data: { readAt: new Date() },
  });
  const urls = await signMediaUrls(inspection.items.flatMap((i) => i.media.map((m) => m.path)));
  const issueLinks = await issueLinksFor(inspection, (id) => `/dashboard/homeowner/homes/${homeId}/issues/${id}`);
  const proLinkFor = contractorSearchAvailable()
    ? (itemKey: string, itemName: string) => {
        const trade = tradeForItem(itemKey, itemName);
        return { href: `/dashboard/homeowner/homes/${homeId}/pros?trade=${trade.key}`, label: `Find ${trade.plural} near my property` };
      }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homeowner/homes/${homeId}`} label={`Back to ${inspection.home.nickname}`} />
      <div className="mt-4">
        <InspectionReport inspection={inspection} mediaUrls={urls} branded issueLinks={issueLinks} proLinkFor={proLinkFor} />
      </div>
    </div>
  );
}
