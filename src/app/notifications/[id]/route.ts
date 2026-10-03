import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Opening a notification: marks it read, then goes to what it's about. Only the recipient can open
// it, and it only ever leads to a path inside the app.
export async function GET(request: Request, ctx: RouteContext<"/notifications/[id]">) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const note = await prisma.notification.findFirst({ where: { id, userId: session.user.id } });
  if (!note) return NextResponse.redirect(new URL("/dashboard", request.url));
  if (!note.readAt) await prisma.notification.update({ where: { id: note.id }, data: { readAt: new Date() } });

  const target = /^\/(?![/\\])/.test(note.link) ? note.link : "/dashboard";
  return NextResponse.redirect(new URL(target, request.url));
}
