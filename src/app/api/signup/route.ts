import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { appUrl, emails, isEmailConfigured, sendEmail } from "@/lib/email";
import { issueToken } from "@/lib/tokens";
import { claimInvites } from "@/lib/invites";

const VALID_ROLES = ["homeowner", "homewatcher"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const role = typeof body?.role === "string" ? body.role : "";

  if (!email || !password || !name || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const emailEnabled = isEmailConfigured();

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      emailVerifiedAt: emailEnabled ? null : new Date(),
    },
  });

  if (!emailEnabled) {
    await claimInvites(user);
    return NextResponse.json({ ok: true, needsVerification: false });
  }

  const token = await issueToken(user.id, "verify_email");
  if (token) {
    const mail = emails.verify(`${appUrl()}/verify-email?token=${token}`);
    await sendEmail({ to: email, ...mail });
  }
  return NextResponse.json({ ok: true, needsVerification: true });
}
