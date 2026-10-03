import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { signMediaUrls } from "@/lib/media";
import { isIssueStatus } from "@/lib/issues";
import { contractorSearchAvailable, tradeForItem } from "@/lib/contractors";
import { updateIssueAction } from "@/lib/actions/issues";
import { BackLink } from "@/components/back-link";
import { IssueDetail } from "@/components/issue-detail";
import { IssueUpdateForm } from "@/components/issue-update-form";

export default async function HomeownerIssuePage(props: PageProps<"/dashboard/homeowner/homes/[homeId]/issues/[issueId]">) {
  const { homeId, issueId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  // Only issues at a home this homeowner owns.
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, homeId, home: { ownerId: session.user.id } },
    include: {
      home: true,
      item: { include: { media: { orderBy: { createdAt: "asc" } } } },
      events: { include: { author: { select: { name: true, email: true } } } },
    },
  });
  if (!issue || !isIssueStatus(issue.status)) notFound();

  // Opening the issue counts as reading its notifications.
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null, link: `/dashboard/homeowner/homes/${homeId}/issues/${issueId}` },
    data: { readAt: new Date() },
  });
  const urls = await signMediaUrls((issue.item?.media ?? []).map((m) => m.path));

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homeowner/homes/${homeId}`} label={`Back to ${issue.home.nickname}`} />
      <div className="mt-4">
        <IssueDetail
          issue={issue}
          mediaUrls={urls}
          reportHrefFor={(id) => `/dashboard/homeowner/homes/${homeId}/inspections/${id}`}
          form={<IssueUpdateForm action={updateIssueAction.bind(null, issue.id)} current={issue.status} />}
          findPros={
            contractorSearchAvailable()
              ? {
                  href: `/dashboard/homeowner/homes/${homeId}/pros?trade=${tradeForItem(issue.itemKey).key}&issue=${issue.id}`,
                  label: `Find ${tradeForItem(issue.itemKey).plural} near my property`,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
