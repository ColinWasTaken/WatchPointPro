import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appUrl, emails } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

// Client invitations: a company emails a homeowner a single-use link. Accepting it connects the
// homeowner's account to their Client record and sets them as owner of that client's properties,
// which is what the homeowner pages already check. Only an account whose verified email matches the
// invitation can accept it, so a forwarded link can't connect someone else's account.

export const INVITATION_TTL_DAYS = 14;
const TTL_MS = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// A reason an invitation can't be accepted, safe to show to the person accepting it.
export class InvitationError extends Error {}

type Account = { id: string; email: string; name: string | null; role: string | null; emailVerifiedAt: Date | null };

export const invitationUrl = (token: string) => `${appUrl()}/invite?token=${token}`;

// Issues a fresh link for a client, replacing any unaccepted one. Returns null while the previous
// invitation is under a minute old (email-spam guard).
export async function issueClientInvitation(
  client: { id: string; companyId: string; email: string },
  invitedById: string,
) {
  const recent = await prisma.invitation.findFirst({
    where: { clientId: client.id, acceptedAt: null, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
  });
  if (recent) return null;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.invitation.deleteMany({ where: { clientId: client.id, acceptedAt: null } }),
    prisma.invitation.create({
      data: {
        companyId: client.companyId,
        kind: "client",
        clientId: client.id,
        email: client.email,
        tokenHash: hash(token),
        invitedById,
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    }),
  ]);
  return token;
}

// The invitation behind a link, or null when it's unknown, used, expired, or out of date (the
// client's email changed or they already have access).
export async function findOpenInvitation(token: string) {
  if (!token) return null;
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hash(token) },
    include: { company: true, client: true },
  });
  const client = invitation?.client;
  if (
    !invitation ||
    !client ||
    invitation.kind !== "client" ||
    invitation.acceptedAt ||
    invitation.expiresAt < new Date() ||
    client.email !== invitation.email ||
    client.userId
  ) {
    return null;
  }
  return { ...invitation, client };
}

// Connects the account to the invited client and the client's properties. Runs inside the caller's
// transaction, so any failure rolls the whole acceptance back, and the conditional updates make a
// second, concurrent acceptance of the same invitation fail.
async function link(tx: Prisma.TransactionClient, invitationId: string, account: Account) {
  if (account.role !== "homeowner") {
    throw new InvitationError("This email belongs to a homewatcher account, so it can't be connected as a homeowner.");
  }
  if (!account.emailVerifiedAt) throw new InvitationError("Confirm your email address first.");

  const invitation = await tx.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation?.clientId || invitation.email !== account.email) {
    throw new InvitationError("This invitation was sent to a different email address.");
  }

  const claimed = await tx.invitation.updateMany({
    where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
    data: { acceptedAt: new Date() },
  });
  if (claimed.count !== 1) throw new InvitationError("This invitation has already been used or has expired.");

  const linked = await tx.client.updateMany({
    where: { id: invitation.clientId, companyId: invitation.companyId, email: account.email, userId: null },
    data: { userId: account.id },
  });
  if (linked.count !== 1) {
    throw new InvitationError("This invitation is no longer valid. Ask your home-watch company to send a new one.");
  }

  await tx.home.updateMany({
    where: { clientId: invitation.clientId, companyId: invitation.companyId },
    data: { ownerId: account.id },
  });
  await tx.invitation.deleteMany({ where: { clientId: invitation.clientId, acceptedAt: null } });
  return invitation;
}

async function notifyInviter(invitation: { clientId: string | null; invitedById: string | null }, account: Account) {
  await notifyUser(
    invitation.invitedById,
    emails.clientJoined(account.name ?? account.email, `${appUrl()}/dashboard/homewatcher/clients/${invitation.clientId}`),
  );
}

// Accepts an invitation for an existing, verified homeowner account.
export async function acceptInvitation(invitationId: string, account: Account) {
  const invitation = await prisma.$transaction((tx) => link(tx, invitationId, account));
  await notifyInviter(invitation, account);
}

// Creates a homeowner account from an invitation link and accepts it in one transaction. Following
// the emailed link proves the person controls the address, so the account starts verified.
export async function createAccountFromInvitation(
  invitationId: string,
  data: { email: string; name: string; passwordHash: string },
) {
  const { account, invitation } = await prisma.$transaction(async (tx) => {
    const account = await tx.user.create({ data: { ...data, role: "homeowner", emailVerifiedAt: new Date() } });
    return { account, invitation: await link(tx, invitationId, account) };
  });
  await notifyInviter(invitation, account);
  // Other companies may have invited the same address.
  await claimClientInvitations(account);
  return account;
}

// Called once a homeowner proves they own their email (confirmation or password-reset link), so
// signing up the usual way still connects them to every company that invited them. Never throws:
// a failed claim must not fail the confirmation itself.
export async function claimClientInvitations(account: Account) {
  if (account.role !== "homeowner" || !account.emailVerifiedAt) return;
  try {
    const open = await prisma.invitation.findMany({
      where: { email: account.email, kind: "client", acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    for (const { id } of open) {
      try {
        await acceptInvitation(id, account);
      } catch (err) {
        if (!(err instanceof InvitationError)) throw err;
      }
    }
  } catch (err) {
    console.error("claimClientInvitations failed", err);
  }
}

// Ends a client's access: their account stops seeing the company's properties.
export async function removeClientAccess(client: { id: string; companyId: string }) {
  await prisma.$transaction([
    prisma.home.updateMany({ where: { clientId: client.id, companyId: client.companyId }, data: { ownerId: null } }),
    prisma.client.update({ where: { id: client.id }, data: { userId: null } }),
  ]);
}
