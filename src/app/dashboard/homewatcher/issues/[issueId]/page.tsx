import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { issueScope, requireCompany } from "@/lib/authz";
import { signMediaUrls } from "@/lib/media";
import { isIssueStatus } from "@/lib/issues";
import { contractorSearchAvailable, tradeForItem } from "@/lib/contractors";
import { updateIssueAction } from "@/lib/actions/issues";
import { BackLink } from "@/components/back-link";
import { IssueDetail } from "@/components/issue-detail";
import { IssueUpdateForm } from "@/components/issue-update-form";

export default async function CompanyIssuePage(props: PageProps<"/dashboard/homewatcher/issues/[issueId]">) {
  const { issueId } = await props.params;
  const ctx = await requireCompany();
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, ...issueScope(ctx) },
    include: {
      home: true,
      item: { include: { media: { orderBy: { createdAt: "asc" } } } },
      events: { include: { author: { select: { name: true, email: true } } } },
    },
  });
  if (!issue || !isIssueStatus(issue.status)) notFound();
  await prisma.notification.updateMany({
    where: { userId: ctx.userId, readAt: null, link: `/dashboard/homewatcher/issues/${issueId}` },
    data: { readAt: new Date() },
  });
  const urls = await signMediaUrls((issue.item?.media ?? []).map((m) => m.path));

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homewatcher/properties/${issue.homeId}`} label={`Back to ${issue.home.nickname}`} />
      <div className="mt-4">
        <IssueDetail
          issue={issue}
          mediaUrls={urls}
          reportHrefFor={(id) => `/dashboard/homewatcher/inspections/${id}`}
          form={<IssueUpdateForm action={updateIssueAction.bind(null, issue.id)} current={issue.status} />}
          findPros={
            contractorSearchAvailable()
              ? {
                  href: `/dashboard/homewatcher/properties/${issue.homeId}/pros?trade=${tradeForItem(issue.itemKey, issue.title).key}&issue=${issue.id}`,
                  label: `Find ${tradeForItem(issue.itemKey, issue.title).plural} near this property`,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
