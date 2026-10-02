import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appUrl, emails } from "@/lib/email";
import { notifyUser } from "@/lib/notify";
import { deletePhoto } from "@/lib/uploads";

// Invitations: a company emails someone a single-use link.
//   client   – connects a homeowner account to the Client record and that client's properties, by
//              setting it as their owner (which is what the homeowner pages already check).
//   employee – adds a homewatcher account to the company's team with the invited role.
// Only an account whose verified email matches the invitation can accept it, so a forwarded link
// can't connect someone else's account.

export const INVITATION_TTL_DAYS = 14;
const TTL_MS = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// A reason an invitation can't be accepted, safe to show to the person accepting it.
export class InvitationError extends Error {}

type Account = { id: string; email: string; name: string | null; role: string | null; emailVerifiedAt: Date | null };
type Db = Prisma.TransactionClient | typeof prisma;

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

// Same for a team invitation, keyed by company and email address.
export async function issueEmployeeInvitation(
  invite: { companyId: string; email: string; role: "admin" | "employee" },
  invitedById: string,
) {
  const pending = { companyId: invite.companyId, email: invite.email, kind: "employee", acceptedAt: null };
  const recent = await prisma.invitation.findFirst({
    where: { ...pending, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
  });
  if (recent) return null;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.invitation.deleteMany({ where: pending }),
    prisma.invitation.create({
      data: { ...invite, kind: "employee", tokenHash: hash(token), invitedById, expiresAt: new Date(Date.now() + TTL_MS) },
    }),
  ]);
  return token;
}

// The invitation behind a link, or null when it's unknown, used, expired, or out of date (for a
// client invitation: the client's email changed or they already have access).
export async function findOpenInvitation(token: string) {
  if (!token) return null;
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hash(token) },
    include: { company: true, client: true, invitedBy: { select: { name: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) return null;

  if (invitation.kind === "client") {
    const client = invitation.client;
    if (!client || client.email !== invitation.email || client.userId) return null;
    return { ...invitation, kind: "client" as const, client };
  }
  if (invitation.kind === "employee") return { ...invitation, kind: "employee" as const };
  return null;
}

// A company with only its creator and no clients or properties, e.g. one set up by mistake.
export async function isEmptySoloCompany(db: Db, companyId: string) {
  const [members, clients, homes] = await Promise.all([
    db.companyMember.count({ where: { companyId } }),
    db.client.count({ where: { companyId } }),
    db.home.count({ where: { companyId } }),
  ]);
  return members <= 1 && clients === 0 && homes === 0;
}

type InvitationRow = Prisma.InvitationGetPayload<{ include: { company: true } }>;

async function connectClient(tx: Prisma.TransactionClient, invitation: InvitationRow, account: Account) {
  const linked = await tx.client.updateMany({
    where: { id: invitation.clientId ?? "", companyId: invitation.companyId, email: account.email, userId: null },
    data: { userId: account.id },
  });
  if (!invitation.clientId || linked.count !== 1) {
    throw new InvitationError("This invitation is no longer valid. Ask your home-watch company to send a new one.");
  }
  await tx.home.updateMany({
    where: { clientId: invitation.clientId, companyId: invitation.companyId },
    data: { ownerId: account.id },
  });
  await tx.invitation.deleteMany({ where: { clientId: invitation.clientId, acceptedAt: null } });
}

// Adds the account to the team. Someone belongs to one company at most, so a company of their own
// is replaced only when it's empty. Returns that company's logo so it can be removed from storage.
async function joinTeam(tx: Prisma.TransactionClient, invitation: InvitationRow, account: Account) {
  let removedLogo: string | null = null;
  const current = await tx.companyMember.findUnique({ where: { userId: account.id }, include: { company: true } });

  if (current?.companyId !== invitation.companyId) {
    if (current) {
      if (!(await isEmptySoloCompany(tx, current.companyId))) {
        throw new InvitationError(`You're already on ${current.company.name}'s team. You can only belong to one company.`);
      }
      removedLogo = current.company.logoUrl;
      await tx.company.delete({ where: { id: current.companyId } });
    }
    await tx.companyMember.create({
      data: { companyId: invitation.companyId, userId: account.id, role: invitation.role === "admin" ? "admin" : "employee" },
    });
  }
  await tx.invitation.deleteMany({
    where: { companyId: invitation.companyId, email: account.email, kind: "employee", acceptedAt: null },
  });
  return removedLogo;
}

// Accepts inside the caller's transaction, so any failure rolls the whole acceptance back, and the
// conditional update makes a second, concurrent acceptance of the same invitation fail.
async function link(tx: Prisma.TransactionClient, invitationId: string, account: Account) {
  const invitation = await tx.invitation.findUnique({ where: { id: invitationId }, include: { company: true } });
  if (!invitation || invitation.email !== account.email) {
    throw new InvitationError("This invitation was sent to a different email address.");
  }
  const employee = invitation.kind === "employee";
  if (account.role !== (employee ? "homewatcher" : "homeowner")) {
    throw new InvitationError(
      employee
        ? "This email belongs to a homeowner account, so it can't join a company team."
        : "This email belongs to a homewatcher account, so it can't be connected as a homeowner.",
    );
  }
  if (!account.emailVerifiedAt) throw new InvitationError("Confirm your email address first.");

  const claimed = await tx.invitation.updateMany({
    where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
    data: { acceptedAt: new Date() },
  });
  if (claimed.count !== 1) throw new InvitationError("This invitation has already been used or has expired.");

  if (employee) return { invitation, removedLogo: await joinTeam(tx, invitation, account) };
  await connectClient(tx, invitation, account);
  return { invitation, removedLogo: null };
}

async function notifyInviter(invitation: InvitationRow, account: Account) {
  const name = account.name ?? account.email;
  await notifyUser(
    invitation.invitedById,
    invitation.kind === "employee"
      ? emails.employeeJoined(name, invitation.company.name, `${appUrl()}/dashboard/homewatcher/team`)
      : emails.clientJoined(name, `${appUrl()}/dashboard/homewatcher/clients/${invitation.clientId}`),
  );
}

// Accepts an invitation for an existing, verified account.
export async function acceptInvitation(invitationId: string, account: Account) {
  const { invitation, removedLogo } = await prisma.$transaction((tx) => link(tx, invitationId, account));
  await deletePhoto(removedLogo);
  await notifyInviter(invitation, account);
  return invitation;
}

// Creates an account from an invitation link and accepts it in one transaction: a homeowner for a
// client invitation, a homewatcher for a team invitation. Following the emailed link proves the
// person controls the address, so the account starts verified.
export async function createAccountFromInvitation(
  invitationId: string,
  data: { email: string; name: string; passwordHash: string },
) {
  const { account, invitation } = await prisma.$transaction(async (tx) => {
    const pending = await tx.invitation.findUnique({ where: { id: invitationId }, select: { kind: true } });
    const role = pending?.kind === "employee" ? "homewatcher" : "homeowner";
    const account = await tx.user.create({ data: { ...data, role, emailVerifiedAt: new Date() } });
    return { account, invitation: (await link(tx, invitationId, account)).invitation };
  });
  await notifyInviter(invitation, account);
  // Other companies may have invited the same address.
  await claimInvitations(account);
  return invitation;
}

// Called once someone proves they own their email (confirmation or password-reset link), so signing
// up the usual way still accepts what was sent to that address: client invitations for homeowners,
// team invitations for homewatchers (newest first; only one team can be joined). Never throws: a
// failed claim must not fail the confirmation itself.
export async function claimInvitations(account: Account) {
  const kind = account.role === "homeowner" ? "client" : account.role === "homewatcher" ? "employee" : null;
  if (!kind || !account.emailVerifiedAt) return;
  try {
    const open = await prisma.invitation.findMany({
      where: { email: account.email, kind, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
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
    console.error("claimInvitations failed", err);
  }
}

// Ends a client's access: their account stops seeing the company's properties.
export async function removeClientAccess(client: { id: string; companyId: string }) {
  await prisma.$transaction([
    prisma.home.updateMany({ where: { clientId: client.id, companyId: client.companyId }, data: { ownerId: null } }),
    prisma.client.update({ where: { id: client.id }, data: { userId: null } }),
  ]);
}
