"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, emails } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

export type ActionState = { error?: string; success?: string };

async function requireHomewatcher() {
  const session = await auth();
  if (!session || session.user.role !== "homewatcher") {
    redirect("/login");
  }
  return session;
}

export async function acceptAssignmentAction(assignmentId: string) {
  const session = await requireHomewatcher();

  const assignment = await prisma.homeAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment || assignment.homewatcherId !== session.user.id) {
    return;
  }

  await prisma.homeAssignment.update({
    where: { id: assignmentId },
    data: { status: "accepted" },
  });

  const home = await prisma.home.findUnique({ where: { id: assignment.homeId } });
  if (home) {
    await notifyUser(
      home.ownerId,
      emails.invitationAccepted(
        session.user.name ?? session.user.email ?? "Your homewatcher",
        home.nickname,
        `${appUrl()}/dashboard/homeowner/homes/${home.id}`,
      ),
    );
  }

  revalidatePath("/dashboard/homewatcher");
}

export async function declineAssignmentAction(assignmentId: string) {
  const session = await requireHomewatcher();

  const assignment = await prisma.homeAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment || assignment.homewatcherId !== session.user.id) {
    return;
  }

  await prisma.homeAssignment.delete({ where: { id: assignmentId } });

  revalidatePath("/dashboard/homewatcher");
}

export async function updateWatcherNotesAction(
  homeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireHomewatcher();

  const assignment = await prisma.homeAssignment.findUnique({
    where: { homeId_homewatcherId: { homeId, homewatcherId: session.user.id } },
  });
  if (!assignment || assignment.status !== "accepted") {
    return { error: "You are not assigned to this home." };
  }

  const watcherNotes = String(formData.get("watcherNotes") ?? "").trim();

  await prisma.homeAssignment.update({
    where: { id: assignment.id },
    data: { watcherNotes: watcherNotes || null },
  });

  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  return { success: "Notes saved." };
}

export async function leaveHomeAction(homeId: string) {
  const session = await requireHomewatcher();

  await prisma.homeAssignment.deleteMany({
    where: { homeId, homewatcherId: session.user.id },
  });

  revalidatePath("/dashboard/homewatcher");
  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  redirect("/dashboard/homewatcher");
}
