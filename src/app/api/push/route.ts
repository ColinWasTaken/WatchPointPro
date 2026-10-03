import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cleanSubscription, deviceName, saveSubscription } from "@/lib/push";

// The service worker calls this when the browser replaces a push subscription, so notifications
// keep arriving on that device. (Settings uses server actions.) Same-site JSON requests only.
export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new NextResponse(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new NextResponse(null, { status: 415 });

  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const body = (await request.json().catch(() => null)) as { subscription?: unknown; replaces?: unknown } | null;
  const sub = cleanSubscription(body?.subscription);
  if (!sub) return new NextResponse(null, { status: 400 });

  if (typeof body?.replaces === "string" && body.replaces !== sub.endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id, endpoint: body.replaces } });
  }
  await saveSubscription(session.user.id, sub, deviceName(request.headers.get("user-agent")));
  return new NextResponse(null, { status: 204 });
}
