import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl, emails, isEmailConfigured, sendEmail } from "@/lib/email";
import { issueToken } from "@/lib/tokens";

// Always answers the same way so it can't be used to discover which emails have accounts.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email && isEmailConfigured()) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt) {
      const token = await issueToken(user.id, "verify_email");
      if (token) {
        await sendEmail({ to: email, ...emails.verify(`${appUrl()}/verify-email?token=${token}`) });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
