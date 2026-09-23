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
    await Promise.all(
      visit.home.assignments.map((a) =>
        notifyUser(a.homewatcherId, (tz) =>
          emails.visitReminder(
            visit.home.nickname,
            visit.home.address,
            formatWhen(visit.scheduledFor, tz),
            `${appUrl()}/dashboard/homewatcher/homes/${visit.homeId}`,
          ),
        ),
      ),
    );
    await prisma.visit.update({ where: { id: visit.id }, data: { reminderSentAt: new Date() } });
  }

  return NextResponse.json({ ok: true, reminded: visits.length });
}
