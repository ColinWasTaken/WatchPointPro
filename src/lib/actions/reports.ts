"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deletePhoto, savePhotos } from "@/lib/uploads";
import { appUrl, emails } from "@/lib/email";
import { notifyUser } from "@/lib/notify";
import { REPORT_STATUS_LABEL, parseReportStatus } from "@/lib/report-status";

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
  const status = parseReportStatus(formData.get("status"));
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File);

  let photoUrls: string[] = [];
  try {
    photoUrls = await savePhotos(photos);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save photos." };
  }

  const report = await prisma.report.create({
    data: {
      homeId,
      homewatcherId: session.user.id,
      status,
      checklistResults: JSON.stringify(checklistResults),
      notes: notes || null,
      photoUrls: JSON.stringify(photoUrls),
    },
  });

  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (home) {
    await notifyUser(
      home.ownerId,
      emails.newReport(
        session.user.name ?? "Your homewatcher",
        home.nickname,
        REPORT_STATUS_LABEL[status],
        `${appUrl()}/dashboard/homeowner/homes/${homeId}/reports/${report.id}`,
      ),
    );
  }

  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  revalidatePath("/dashboard/homeowner");
  redirect(`/dashboard/homewatcher/homes/${homeId}`);
}

export async function deleteReportAction(reportId: string) {
  const session = await auth();
  if (!session || session.user.role !== "homewatcher") redirect("/login");

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.homewatcherId !== session.user.id) return;

  const photoUrls = JSON.parse(report.photoUrls) as string[];
  await prisma.report.delete({ where: { id: reportId } });
  await Promise.all(photoUrls.map((url) => deletePhoto(url)));

  revalidatePath(`/dashboard/homewatcher/homes/${report.homeId}`);
  revalidatePath(`/dashboard/homeowner/homes/${report.homeId}`);
  revalidatePath("/dashboard/homeowner");
  redirect(`/dashboard/homewatcher/homes/${report.homeId}/reports`);
}
