"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, emails, formatWhen } from "@/lib/email";
import { notify } from "@/lib/notify";
import { findProperty, getCompanyContext, isAdmin } from "@/lib/authz";

export type ActionState = { error?: string; success?: string };

// Who may schedule at a home, and whether they may cancel anyone's visit or only their own:
//   independent home – its owner (any visit) or an accepted homewatcher (own visits)
//   company property – a company member who can see it: admins (any visit), the assigned employee
//                      (own visits). The homeowner doesn't schedule here; the company does.
async function homeAccess(homeId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const home = await prisma.home.findUnique({
    where: { id: homeId },
    include: { assignments: { where: { status: "accepted" } } },
  });
  if (!home) return null;

  if (home.companyId) {
    const ctx = await getCompanyContext(session.user.id);
    if (!ctx || !(await findProperty(ctx, home.id))) return null;
    return { session, home, as: "company" as const, canCancelAny: isAdmin(ctx) };
  }
  if (home.ownerId === session.user.id) return { session, home, as: "owner" as const, canCancelAny: true };
  if (home.assignments.some((a) => a.homewatcherId === session.user.id)) {
    return { session, home, as: "watcher" as const, canCancelAny: false };
  }
  return null;
}

function revalidateVisitPages(homeId: string) {
  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  revalidatePath(`/dashboard/homewatcher/homes/${homeId}`);
  revalidatePath(`/dashboard/homewatcher/properties/${homeId}`);
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
  const { session, home, as } = access;

  const when = new Date(String(formData.get("when") ?? ""));
  if (Number.isNaN(when.getTime())) return { error: "Pick a date and time." };
  if (when.getTime() < Date.now() - 5 * 60 * 1000) return { error: "That time is in the past." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  await prisma.visit.create({
    data: { homeId, scheduledFor: when, note: note || null, createdById: session.user.id },
  });

  // Tell the other side: owner → homewatchers, homewatcher → owner, company → the assigned employee
  // and the homeowner (who hears it's from the company, without the team's note).
  const by = session.user.name ?? "Someone";
  const company = home.companyId ? await prisma.company.findUnique({ where: { id: home.companyId }, select: { name: true } }) : null;
  const recipients: { id: string | null; path: string; by: string }[] =
    as === "owner"
      ? home.assignments.map((a) => ({ id: a.homewatcherId, path: `homewatcher/homes/${homeId}`, by }))
      : as === "watcher"
        ? [{ id: home.ownerId, path: `homeowner/homes/${homeId}`, by }]
        : [
            { id: home.assignedEmployeeId, path: `homewatcher/properties/${homeId}`, by },
            { id: home.ownerId, path: `homeowner/homes/${homeId}`, by: company?.name ?? by },
          ];
  await Promise.all(
    recipients
      .filter((r): r is { id: string; path: string; by: string } => Boolean(r.id) && r.id !== session.user.id)
      .map((r) =>
        notify(
          r.id,
          (tz) => ({
            type: "visit_scheduled",
            title: `${as === "company" ? "Check" : "Visit"} scheduled at ${home.nickname}`,
            body: `${formatWhen(when, tz)} · scheduled by ${r.by}`,
            link: `/dashboard/${r.path}`,
          }),
          (tz) => emails.visitScheduled(r.by, home.nickname, formatWhen(when, tz), `${appUrl()}/dashboard/${r.path}`),
        ),
      ),
  );

  revalidateVisitPages(homeId);
  return { success: as === "company" ? "Check scheduled." : "Visit scheduled." };
}

export async function deleteVisitAction(visitId: string) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  const access = visit ? await homeAccess(visit.homeId) : null;
  if (!visit || !access) return;
  if (!access.canCancelAny && visit.createdById !== access.session.user.id) return;

  await prisma.visit.delete({ where: { id: visitId } });
  revalidateVisitPages(visit.homeId);
}
