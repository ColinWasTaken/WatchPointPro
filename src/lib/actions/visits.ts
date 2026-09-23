"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, emails, formatWhen } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

export type ActionState = { error?: string; success?: string };

// Returns the home if the signed-in user owns it or is an accepted homewatcher on it.
async function homeAccess(homeId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const home = await prisma.home.findUnique({
    where: { id: homeId },
    include: { assignments: { where: { status: "accepted" } } },
  });
  if (!home) return null;

  const isOwner = home.ownerId === session.user.id;
  const isWatcher = home.assignments.some((a) => a.homewatcherId === session.user.id);
  if (!isOwner && !isWatcher) return null;

  return { session, home, isOwner };
}

function revalidateVisitPages(homeId: string) {
  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  revalidatePath("/dashboard/homeowner");
  revalidatePath("/dashboard/homewatcher");
  revalidatePath("/dashboard/homewatcher/schedule");
}

export async function scheduleVisitAction(
  homeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await homeAccess(homeId);
  if (!access) return { error: "Home not found." };
  const { session, home, isOwner } = access;

  const when = new Date(String(formData.get("when") ?? ""));
  if (Number.isNaN(when.getTime())) return { error: "Pick a date and time." };
  if (when.getTime() < Date.now() - 5 * 60 * 1000) return { error: "That time is in the past." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  await prisma.visit.create({
    data: { homeId, scheduledFor: when, note: note || null, createdById: session.user.id },
  });

  const by = session.user.name ?? "Someone";
  const recipients = isOwner ? home.assignments.map((a) => a.homewatcherId) : [home.ownerId];
  const path = isOwner ? "homewatcher" : "homeowner";
  await Promise.all(
    recipients.map((id) =>
      notifyUser(id, (tz) =>
        emails.visitScheduled(by, home.nickname, formatWhen(when, tz), `${appUrl()}/dashboard/${path}/homes/${homeId}`),
      ),
    ),
  );

  revalidateVisitPages(homeId);
  return { success: "Visit scheduled." };
}

export async function deleteVisitAction(visitId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const visit = await prisma.visit.findUnique({ where: { id: visitId }, include: { home: true } });
  if (!visit) return;
  if (visit.createdById !== session.user.id && visit.home.ownerId !== session.user.id) return;

  await prisma.visit.delete({ where: { id: visitId } });
  revalidateVisitPages(visit.homeId);
}
