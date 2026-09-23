"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deletePhoto, savePhoto } from "@/lib/uploads";
import { appUrl, emails, isEmailConfigured, sendEmail } from "@/lib/email";
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
  const ownerName = session.user.name ?? session.user.email ?? "A homeowner";

  if (!watcher) {
    await prisma.homeInvite.upsert({
      where: { homeId_email: { homeId, email } },
      create: { homeId, email },
      update: {},
    });
    revalidatePath(`/dashboard/homeowner/homes/${homeId}`);

    if (!isEmailConfigured()) {
      return {
        success: `Invitation saved for ${email}. Email sending isn't set up yet, so ask them to sign up as a homewatcher with that address.`,
      };
    }
    const mail = emails.invite(ownerName, home.nickname, `${appUrl()}/login?role=homewatcher`);
    await sendEmail({ to: email, ...mail });
    return { success: `Invitation emailed to ${email}. It'll be waiting when they sign up.` };
  }

  if (watcher.role !== "homewatcher") {
    return { error: "That email belongs to a homeowner account, so it can't be invited as a homewatcher." };
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

  await sendEmail({ to: email, ...emails.inviteExisting(ownerName, home.nickname, `${appUrl()}/login`) });

  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  return { success: `Invited ${watcher.name ?? watcher.email}. Waiting for them to accept.` };
}

export async function updateHomeAction(
  homeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireHomeowner();

  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home || home.ownerId !== session.user.id) {
    return { error: "Home not found." };
  }

  const nickname = String(formData.get("nickname") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const removePhoto = formData.get("removePhoto") === "on";
  const photo = formData.get("photo");

  if (!nickname || !address) {
    return { error: "Nickname and address are required." };
  }

  let photoUrl = home.photoUrl;
  try {
    if (photo instanceof File && photo.size > 0) {
      photoUrl = await savePhoto(photo);
    } else if (removePhoto) {
      photoUrl = null;
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save photo." };
  }

  await prisma.home.update({
    where: { id: homeId },
    data: { nickname, address, notes: notes || null, photoUrl },
  });

  if (photoUrl !== home.photoUrl) {
    await deletePhoto(home.photoUrl);
  }

  revalidatePath("/dashboard/homeowner");
  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  redirect(`/dashboard/homeowner/homes/${homeId}`);
}
