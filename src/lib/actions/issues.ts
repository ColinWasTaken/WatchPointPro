"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findProperty, getCompanyContext } from "@/lib/authz";
import { appUrl, emails } from "@/lib/email";
import { cleanText } from "@/lib/fields";
import { notify } from "@/lib/notify";
import { ISSUE_STATUS_LABEL, isIssueStatus } from "@/lib/issues";

export type IssueActionState = { error?: string; success?: string };

const companyLink = (id: string) => `/dashboard/homewatcher/issues/${id}`;
const homeownerLink = (homeId: string, id: string) => `/dashboard/homeowner/homes/${homeId}/issues/${id}`;

// Who is acting on an issue: a company member who can see the property, or the homeowner.
async function issueAccess(issueId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: { home: true, company: true } });
  if (!issue) return null;

  if (session.user.role === "homewatcher") {
    const ctx = await getCompanyContext(session.user.id);
    if (!ctx || issue.companyId !== ctx.company.id || !(await findProperty(ctx, issue.homeId))) return null;
    return { session, issue, side: "company" as const };
  }
  if (issue.home.ownerId === session.user.id) return { session, issue, side: "homeowner" as const };
  return null;
}

// Changes an issue's status and/or adds a note, recorded on its timeline. The other side hears
// about it: homeowner updates go to the company's admins and the assigned team member, company
// updates go to the homeowner (by email too when the issue is resolved).
export async function updateIssueAction(
  issueId: string,
  _prev: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  const access = await issueAccess(issueId);
  if (!access) return { error: "Issue not found." };
  const { session, issue, side } = access;

  const status = String(formData.get("status") ?? issue.status);
  if (!isIssueStatus(status)) return { error: "Choose a status." };
  const note = cleanText(formData.get("note"), 2000);
  const changed = status !== issue.status;
  if (!changed && !note) return { error: "Choose a new status or add a note." };

  await prisma.$transaction([
    ...(changed
      ? [prisma.issue.update({ where: { id: issue.id }, data: { status, resolvedAt: status === "resolved" ? new Date() : null } })]
      : []),
    prisma.issueEvent.create({
      data: { issueId: issue.id, authorId: session.user.id, kind: changed ? "status" : "note", status: changed ? status : null, note: note || null },
    }),
  ]);

  const who = session.user.name ?? session.user.email ?? "Someone";
  const place = issue.home.street ?? issue.home.nickname;
  const title = changed
    ? `${issue.title} at ${place}: ${ISSUE_STATUS_LABEL[status]}`
    : `${who} added a note on ${issue.title} at ${place}`;
  const body = changed ? (note ? `${who}: ${note}` : `Updated by ${who}`) : note;

  if (side === "company") {
    const link = homeownerLink(issue.homeId, issue.id);
    await notify(
      issue.home.ownerId,
      { type: "issue_updated", title, body, link },
      changed && status === "resolved" ? emails.issueResolved(issue.company, issue.title, place, `${appUrl()}${link}`) : undefined,
    );
  } else {
    const admins = await prisma.companyMember.findMany({ where: { companyId: issue.companyId, role: "admin" }, select: { userId: true } });
    const recipients = new Set([...admins.map((a) => a.userId), issue.home.assignedEmployeeId].filter((id): id is string => Boolean(id)));
    recipients.delete(session.user.id);
    await Promise.all([...recipients].map((id) => notify(id, { type: "issue_updated", title, body, link: companyLink(issue.id) })));
  }

  revalidatePath(companyLink(issue.id));
  revalidatePath(homeownerLink(issue.homeId, issue.id));
  revalidatePath(`/dashboard/homewatcher/properties/${issue.homeId}`);
  revalidatePath(`/dashboard/homeowner/homes/${issue.homeId}`);
  revalidatePath("/dashboard/homewatcher", "layout");
  return { success: changed ? `Marked ${ISSUE_STATUS_LABEL[status].toLowerCase()}.` : "Note added." };
}
