"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deletePhoto } from "@/lib/uploads";

export type ActionState = { error?: string; success?: string };

async function requireUser() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name can't be empty." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, notifyEmail: formData.get("notifyEmail") === "on" },
  });
  revalidatePath("/dashboard", "layout");
  return { success: "Saved." };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { success: "Password updated." };
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Password is incorrect." };
  }

  const ownedHomes = await prisma.home.findMany({
    where: { ownerId: user.id },
    include: { reports: true },
  });
  const ownReports = await prisma.report.findMany({ where: { homewatcherId: user.id } });
  const photos = [
    ...ownedHomes.flatMap((h) => [h.photoUrl, ...h.reports.flatMap((r) => JSON.parse(r.photoUrls) as string[])]),
    ...ownReports.flatMap((r) => JSON.parse(r.photoUrls) as string[]),
  ];

  await prisma.$transaction([
    prisma.home.deleteMany({ where: { ownerId: user.id } }),
    prisma.message.deleteMany({ where: { OR: [{ senderId: user.id }, { recipientId: user.id }] } }),
    prisma.report.deleteMany({ where: { homewatcherId: user.id } }),
    prisma.homeAssignment.deleteMany({ where: { homewatcherId: user.id } }),
    prisma.visit.deleteMany({ where: { createdById: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
  await Promise.all(photos.map((url) => deletePhoto(url)));

  await signOut({ redirectTo: "/" });
  return {};
}

export async function syncTimezoneAction(timezone: string) {
  const session = await auth();
  if (!session) return;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user && user.timezone !== timezone) {
    await prisma.user.update({ where: { id: user.id }, data: { timezone } });
  }
}
