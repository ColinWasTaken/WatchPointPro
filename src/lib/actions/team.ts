"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { emails, isEmailConfigured, sendEmail } from "@/lib/email";
import { requireCompanyAdmin, type CompanyContext } from "@/lib/authz";
import { cleanEmail } from "@/lib/fields";
import { INVITATION_TTL_DAYS, invitationUrl, issueEmployeeInvitation } from "@/lib/invitations";

export type ActionState = { error?: string; success?: string };

const parseRole = (value: FormDataEntryValue | null) => (value === "admin" ? "admin" : "employee");

async function sendTeamInvitation(ctx: CompanyContext, email: string, role: "admin" | "employee"): Promise<ActionState> {
  if (!isEmailConfigured()) return { error: "Email sending isn't set up yet, so invitations can't be sent." };

  const token = await issueEmployeeInvitation({ companyId: ctx.company.id, email, role }, ctx.userId);
  if (!token) return { error: "An invitation was just sent to that address. Wait a minute before sending another." };

  const inviter = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true, email: true } });
  const sent = await sendEmail({
    to: email,
    ...emails.employeeInvite(ctx.company.name, inviter?.name ?? inviter?.email ?? ctx.company.name, invitationUrl(token), INVITATION_TTL_DAYS),
  });
  if (!sent) {
    await prisma.invitation.deleteMany({ where: { companyId: ctx.company.id, email, kind: "employee", acceptedAt: null } });
    return { error: "The invitation email couldn't be sent. Please try again." };
  }

  revalidatePath("/dashboard/homewatcher/team");
  return { success: `Invitation sent to ${email}.` };
}

export async function inviteTeamMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();
  const email = cleanEmail(formData.get("email"));
  if (!email) return { error: "Enter a valid email address." };

  const onTeam = await prisma.companyMember.findFirst({ where: { companyId: ctx.company.id, user: { email } } });
  if (onTeam) return { error: "That person is already on your team." };

  return sendTeamInvitation(ctx, email, parseRole(formData.get("role")));
}

export async function resendTeamInvitationAction(invitationId: string): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, companyId: ctx.company.id, kind: "employee", acceptedAt: null },
  });
  if (!invitation) return { error: "Invitation not found." };
  return sendTeamInvitation(ctx, invitation.email, parseRole(invitation.role));
}

export async function cancelTeamInvitationAction(invitationId: string) {
  const ctx = await requireCompanyAdmin();
  await prisma.invitation.deleteMany({
    where: { id: invitationId, companyId: ctx.company.id, kind: "employee", acceptedAt: null },
  });
  revalidatePath("/dashboard/homewatcher/team");
}

// Admins can't change or remove themselves, so a company always keeps at least one admin.
async function findOtherMember(ctx: CompanyContext, memberId: string) {
  const member = await prisma.companyMember.findFirst({ where: { id: memberId, companyId: ctx.company.id } });
  return member && member.userId !== ctx.userId ? member : null;
}

export async function setMemberRoleAction(memberId: string, role: "admin" | "employee") {
  const ctx = await requireCompanyAdmin();
  const member = await findOtherMember(ctx, memberId);
  if (!member) return;

  await prisma.companyMember.update({ where: { id: member.id }, data: { role: role === "admin" ? "admin" : "employee" } });
  revalidatePath("/dashboard/homewatcher", "layout");
}

// Their properties become unassigned; their account stays, without access to company data.
export async function removeMemberAction(memberId: string) {
  const ctx = await requireCompanyAdmin();
  const member = await findOtherMember(ctx, memberId);
  if (!member) return;

  await prisma.$transaction([
    prisma.home.updateMany({
      where: { companyId: ctx.company.id, assignedEmployeeId: member.userId },
      data: { assignedEmployeeId: null },
    }),
    prisma.companyMember.delete({ where: { id: member.id } }),
  ]);
  revalidatePath("/dashboard/homewatcher", "layout");
}
