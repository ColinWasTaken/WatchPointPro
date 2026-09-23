"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

async function requireAcceptedWatcher(homeId: string) {
  const session = await auth();
  if (!session || session.user.role !== "homewatcher") {
    redirect("/login");
  }

  const assignment = await prisma.homeAssignment.findUnique({
    where: { homeId_homewatcherId: { homeId, homewatcherId: session.user.id } },
  });
  if (!assignment || assignment.status !== "accepted") {
    redirect("/dashboard/homewatcher");
  }

  return session;
}

export async function addChecklistItemAction(
  homeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAcceptedWatcher(homeId);

  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    return { error: "Enter a checklist item." };
  }

  const last = await prisma.checklistItem.findFirst({
    where: { homeId },
    orderBy: { order: "desc" },
  });

  await prisma.checklistItem.create({
    data: { homeId, label, order: (last?.order ?? -1) + 1 },
  });

  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  return {};
}

export async function deleteChecklistItemAction(homeId: string, itemId: string) {
  await requireAcceptedWatcher(homeId);

  await prisma.checklistItem.deleteMany({ where: { id: itemId, homeId } });

  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
}
