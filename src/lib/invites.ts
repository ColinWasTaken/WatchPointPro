import { prisma } from "@/lib/prisma";

// Turns email invitations addressed to a verified homewatcher into pending assignments.
export async function claimInvites(user: { id: string; email: string; role: string | null }) {
  if (user.role !== "homewatcher") return;

  const invites = await prisma.homeInvite.findMany({ where: { email: user.email } });
  for (const invite of invites) {
    await prisma.homeAssignment.upsert({
      where: { homeId_homewatcherId: { homeId: invite.homeId, homewatcherId: user.id } },
      create: { homeId: invite.homeId, homewatcherId: user.id, status: "pending" },
      update: {},
    });
  }
  await prisma.homeInvite.deleteMany({ where: { email: user.email } });
}
