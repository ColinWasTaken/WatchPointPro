"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { emails, isEmailConfigured, sendEmail } from "@/lib/email";
import { findClient, requireCompanyAdmin } from "@/lib/authz";
import { cleanText } from "@/lib/fields";
import {
  INVITATION_TTL_DAYS,
  InvitationError,
  acceptInvitation,
  createAccountFromInvitation,
  findOpenInvitation,
  invitationUrl,
  issueClientInvitation,
  removeClientAccess,
} from "@/lib/invitations";

export type ActionState = { error?: string; success?: string };

function revalidateClient(clientId: string) {
  revalidatePath("/dashboard/homewatcher/clients");
  revalidatePath(`/dashboard/homewatcher/clients/${clientId}`);
}

// ---------- Company side ----------

export async function sendClientInvitationAction(clientId: string): Promise<ActionState> {
  const ctx = await requireCompanyAdmin();
  const client = await findClient(ctx, clientId);
  if (!client) return { error: "Client not found." };
  if (client.userId) return { error: `${client.firstName} already has access.` };
  if (!client.email) return { error: "Add an email address for this client first." };
  if (!isEmailConfigured()) return { error: "Email sending isn't set up yet, so invitations can't be sent." };

  const token = await issueClientInvitation({ id: client.id, companyId: client.companyId, email: client.email }, ctx.userId);
  if (!token) return { error: "An invitation was just sent. Wait a minute before sending another." };

  const sent = await sendEmail({
    to: client.email,
    ...emails.clientInvite(ctx.company.name, client.firstName, invitationUrl(token), INVITATION_TTL_DAYS),
  });
  if (!sent) {
    await prisma.invitation.deleteMany({ where: { clientId: client.id, acceptedAt: null } });
    return { error: "The invitation email couldn't be sent. Please try again." };
  }

  revalidateClient(client.id);
  return { success: `Invitation sent to ${client.email}.` };
}

export async function cancelClientInvitationAction(clientId: string) {
  const ctx = await requireCompanyAdmin();
  const client = await findClient(ctx, clientId);
  if (!client) return;

  await prisma.invitation.deleteMany({ where: { clientId: client.id, acceptedAt: null } });
  revalidateClient(client.id);
}

export async function removeClientAccessAction(clientId: string) {
  const ctx = await requireCompanyAdmin();
  const client = await findClient(ctx, clientId);
  if (!client?.userId) return;

  await removeClientAccess(client);
  revalidateClient(client.id);
  revalidatePath("/dashboard/homeowner", "layout");
}

// ---------- Homeowner side ----------

const invitePath = (token: string) => `/invite?token=${encodeURIComponent(token)}`;

// Accepts for the signed-in account; the invitation must be addressed to that account's email.
export async function acceptInvitationAction(token: string): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect(`/login?next=${encodeURIComponent(invitePath(token))}`);

  const invitation = await findOpenInvitation(token);
  if (!invitation) return { error: "This invitation is invalid or has expired." };
  const account = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!account) redirect("/login");

  try {
    await acceptInvitation(invitation.id, account);
  } catch (err) {
    if (err instanceof InvitationError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard/homeowner", "layout");
  redirect("/dashboard/homeowner?joined=1");
}

// Creates the homeowner's account straight from the invitation link, then signs them in.
export async function signUpFromInvitationAction(
  token: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const invitation = await findOpenInvitation(token);
  if (!invitation) return { error: "This invitation is invalid or has expired." };

  const name = cleanText(formData.get("name"), 100);
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: "Enter your name." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const taken = { error: "There's already an account for this email. Sign in to accept your invitation." };
  if (await prisma.user.findUnique({ where: { email: invitation.email } })) return taken;

  try {
    await createAccountFromInvitation(invitation.id, {
      email: invitation.email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return taken;
    if (err instanceof InvitationError) return { error: err.message };
    throw err;
  }

  await signIn("credentials", { email: invitation.email, password, redirectTo: "/dashboard/homeowner?joined=1" });
  return {};
}
