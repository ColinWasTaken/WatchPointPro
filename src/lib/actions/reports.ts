"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savePhotos } from "@/lib/uploads";

export type ActionState = { error?: string };

export async function submitReportAction(
  homeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session || session.user.role !== "homewatcher") {
    redirect("/login");
  }

  const assignment = await prisma.homeAssignment.findUnique({
    where: { homeId_homewatcherId: { homeId, homewatcherId: session.user.id } },
  });
  if (!assignment || assignment.status !== "accepted") {
    return { error: "You are not assigned to this home." };
  }

  const items = await prisma.checklistItem.findMany({ where: { homeId } });
  const checklistResults: Record<string, boolean> = {};
  for (const item of items) {
    checklistResults[item.id] = formData.get(`item-${item.id}`) === "on";
  }

  const notes = String(formData.get("notes") ?? "").trim();
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File);

  let photoUrls: string[] = [];
  try {
    photoUrls = await savePhotos(photos);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save photos." };
  }

  await prisma.report.create({
    data: {
      homeId,
      homewatcherId: session.user.id,
      checklistResults: JSON.stringify(checklistResults),
      notes: notes || null,
      photoUrls: JSON.stringify(photoUrls),
    },
  });

  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  redirect(`/dashboard/homewatcher/homes/${homeId}`);
}
