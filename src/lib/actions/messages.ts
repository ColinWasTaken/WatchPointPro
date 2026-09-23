"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

export async function sendMessageAction(
  homeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect("/login");

  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    return { error: "Message can't be empty." };
  }

  const home = await prisma.home.findUnique({
    where: { id: homeId },
    include: { assignments: { where: { status: "accepted" } } },
  });
  if (!home) {
    return { error: "Home not found." };
  }

  let recipientId: string;

  if (session.user.role === "homeowner") {
    if (home.ownerId !== session.user.id) {
      return { error: "Home not found." };
    }

    const chosen = String(formData.get("recipientId") ?? "");
    if (chosen) {
      const isValid = home.assignments.some((a) => a.homewatcherId === chosen);
      if (!isValid) {
        return { error: "Choose a valid homewatcher." };
      }
      recipientId = chosen;
    } else if (home.assignments.length === 1) {
      recipientId = home.assignments[0].homewatcherId;
    } else if (home.assignments.length === 0) {
      return { error: "No active homewatcher to message yet." };
    } else {
      return { error: "Choose which homewatcher to message." };
    }
  } else if (session.user.role === "homewatcher") {
    const isAssigned = home.assignments.some(
      (a) => a.homewatcherId === session.user.id,
    );
    if (!isAssigned) {
      return { error: "You are not assigned to this home." };
    }
    recipientId = home.ownerId;
  } else {
    return { error: "Unauthorized." };
  }

  await prisma.message.create({
    data: { homeId, senderId: session.user.id, recipientId, content },
  });

  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  return {};
}
