"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savePhoto } from "@/lib/uploads";
import { DEFAULT_CHECKLIST_ITEMS } from "@/lib/default-checklist";

export type ActionState = { error?: string; success?: string };

async function requireHomeowner() {
  const session = await auth();
  if (!session || session.user.role !== "homeowner") {
    redirect("/login");
  }
  return session;
}

export async function createHomeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireHomeowner();

  const nickname = String(formData.get("nickname") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const photo = formData.get("photo");

  if (!nickname || !address) {
    return { error: "Nickname and address are required." };
  }

  let photoUrl: string | null = null;
  try {
    if (photo instanceof File) {
      photoUrl = await savePhoto(photo);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save photo." };
  }

  const home = await prisma.home.create({
    data: {
      ownerId: session.user.id,
      nickname,
      address,
      notes: notes || null,
      photoUrl,
      checklistItems: {
        create: DEFAULT_CHECKLIST_ITEMS.map((label, order) => ({ label, order })),
      },
    },
  });

  revalidatePath("/dashboard/homeowner");
  redirect(`/dashboard/homeowner/homes/${home.id}`);
}

export async function inviteHomewatcherAction(
  homeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireHomeowner();

  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home || home.ownerId !== session.user.id) {
    return { error: "Home not found." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "Enter an email address." };
  }

  const watcher = await prisma.user.findUnique({ where: { email } });
  if (!watcher || watcher.role !== "homewatcher") {
    return {
      error:
        "No homewatcher account found with that email. Ask them to sign up first, then invite them again.",
    };
  }

  const existing = await prisma.homeAssignment.findUnique({
    where: { homeId_homewatcherId: { homeId, homewatcherId: watcher.id } },
  });
  if (existing) {
    return { error: "That homewatcher is already invited to this home." };
  }

  await prisma.homeAssignment.create({
    data: { homeId, homewatcherId: watcher.id, status: "pending" },
  });

  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  return { success: `Invited ${watcher.name ?? watcher.email}. Waiting for them to accept.` };
}
