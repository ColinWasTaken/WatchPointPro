import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Central authorization for company data. Every company page and server action goes through
// here, so tenant isolation doesn't depend on each caller remembering to filter by company.
//
//   admin     – everything inside their own company
//   employee  – read-only, and only properties assigned to them (plus those properties' clients)
//   homeowner – never sees company data through these helpers; they reach their own homes via
//               the homeowner pages, which check Home.ownerId

export type CompanyRole = "admin" | "employee";

export type CompanyContext = {
  userId: string;
  role: CompanyRole;
  company: NonNullable<Awaited<ReturnType<typeof loadMembership>>>["company"];
};

async function loadMembership(userId: string) {
  return prisma.companyMember.findUnique({ where: { userId }, include: { company: true } });
}

export const getCompanyContext = cache(async (userId: string): Promise<CompanyContext | null> => {
  const membership = await loadMembership(userId);
  if (!membership) return null;
  return { userId, role: membership.role === "admin" ? "admin" : "employee", company: membership.company };
});

async function requireWatcherSession() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "homewatcher") redirect("/dashboard");
  return session;
}

// For pages: redirects to company setup when the signed-in homewatcher has no company yet.
export async function requireCompany(): Promise<CompanyContext> {
  const session = await requireWatcherSession();
  const ctx = await getCompanyContext(session.user.id);
  if (!ctx) redirect("/dashboard/homewatcher/company");
  return ctx;
}

// For pages and actions that only company admins may use.
export async function requireCompanyAdmin(): Promise<CompanyContext> {
  const ctx = await requireCompany();
  if (ctx.role !== "admin") redirect("/dashboard/homewatcher");
  return ctx;
}

export const isAdmin = (ctx: CompanyContext) => ctx.role === "admin";

// Which properties this member may see. Always scoped to their own company.
export function propertyScope(ctx: CompanyContext) {
  return isAdmin(ctx)
    ? { companyId: ctx.company.id }
    : { companyId: ctx.company.id, assignedEmployeeId: ctx.userId };
}

// Which clients this member may see: admins see all; employees only clients who own a property
// assigned to them.
export function clientScope(ctx: CompanyContext) {
  return isAdmin(ctx)
    ? { companyId: ctx.company.id }
    : { companyId: ctx.company.id, homes: { some: { assignedEmployeeId: ctx.userId } } };
}

// Inspections of properties this member may see.
export function inspectionScope(ctx: CompanyContext) {
  return { companyId: ctx.company.id, home: propertyScope(ctx) };
}

// Loaders return null (never someone else's row) when the record is out of scope, so callers
// respond with "not found" and don't reveal that the record exists.
export async function findProperty(ctx: CompanyContext, homeId: string) {
  return prisma.home.findFirst({
    where: { id: homeId, ...propertyScope(ctx) },
    include: { client: true, assignedEmployee: { select: { id: true, name: true, email: true } } },
  });
}

export async function findClient(ctx: CompanyContext, clientId: string) {
  return prisma.client.findFirst({ where: { id: clientId, ...clientScope(ctx) } });
}

export async function getPropertyOr404(ctx: CompanyContext, homeId: string) {
  const property = await findProperty(ctx, homeId);
  if (!property) notFound();
  return property;
}

export async function getClientOr404(ctx: CompanyContext, clientId: string) {
  const client = await findClient(ctx, clientId);
  if (!client) notFound();
  return client;
}

// Members of the company who can be assigned to a property.
export async function companyEmployees(ctx: CompanyContext) {
  const members = await prisma.companyMember.findMany({
    where: { companyId: ctx.company.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email, role: m.role }));
}
