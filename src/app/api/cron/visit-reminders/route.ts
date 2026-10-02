import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl, emails, formatWhen } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer $CRON_SECRET"; without CRON_SECRET set the route stays closed.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const visits = await prisma.visit.findMany({
    where: {
      reminderSentAt: null,
      scheduledFor: { gte: now, lte: new Date(now.getTime() + 26 * 60 * 60 * 1000) },
    },
    include: { home: { include: { assignments: { where: { status: "accepted" } } } } },
  });

  for (const visit of visits) {
    // Independent homes: their accepted homewatchers. Company properties: the assigned employee.
    const recipients = new Set(visit.home.assignments.map((a) => a.homewatcherId));
    if (visit.home.assignedEmployeeId) recipients.add(visit.home.assignedEmployeeId);
    const path = visit.home.companyId ? `properties/${visit.homeId}` : `homes/${visit.homeId}`;
    await Promise.all(
      [...recipients].map((id) =>
        notifyUser(id, (tz) =>
          emails.visitReminder(
            visit.home.nickname,
            visit.home.address,
            formatWhen(visit.scheduledFor, tz),
            `${appUrl()}/dashboard/homewatcher/${path}`,
          ),
        ),
      ),
    );
    await prisma.visit.update({ where: { id: visit.id }, data: { reminderSentAt: new Date() } });
  }

  return NextResponse.json({ ok: true, reminded: visits.length });
}
