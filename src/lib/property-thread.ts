import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findProperty, getCompanyContext } from "@/lib/authz";

// Messages about a company-managed property: one thread between its homeowner and the company.
// The homeowner and every company member who can see the property (admins and the assigned
// team member) can read and reply.

export type ThreadSide = "owner" | "company";

export const threadPath = (side: ThreadSide, homeId: string) =>
  side === "owner" ? `/dashboard/homeowner/homes/${homeId}/messages` : `/dashboard/homewatcher/properties/${homeId}/messages`;

export async function threadAccess(homeId: string) {
  const session = await auth();
  if (!session) return null;
  const home = await prisma.home.findUnique({
    where: { id: homeId },
    include: { company: true, client: true, owner: { select: { id: true, name: true, email: true } } },
  });
  if (!home?.company) return null;
  const base = { userId: session.user.id, home, company: home.company };

  if (session.user.role === "homeowner") {
    return home.ownerId === session.user.id ? { ...base, side: "owner" as const } : null;
  }
  const ctx = await getCompanyContext(session.user.id);
  if (!ctx || ctx.company.id !== home.companyId || !(await findProperty(ctx, homeId))) return null;
  return { ...base, side: "company" as const };
}

export type ThreadAccess = NonNullable<Awaited<ReturnType<typeof threadAccess>>>;

// The newest message, for the links into a thread.
export const latestMessage = (homeId: string) =>
  prisma.propertyMessage.findFirst({
    where: { homeId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, email: true } } },
  });
