"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { appUrl, emails, isEmailConfigured, sendEmail } from "@/lib/email";
import { consumeToken, issueToken, peekToken } from "@/lib/tokens";
import { claimInvites } from "@/lib/invites";

export type ActionState = { error?: string; success?: string };

// Answers identically whether or not the email has an account.
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };

  if (isEmailConfigured()) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await issueToken(user.id, "reset_password");
      if (token) {
        await sendEmail({ to: email, ...emails.reset(`${appUrl()}/reset-password?token=${token}`) });
      }
    }
  }
  return { success: "If an account exists for that email, we've sent a link to reset your password." };
}

export async function resetPasswordAction(
  token: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const row = await peekToken(token, "reset_password");
  if (!row) return { error: "This reset link is invalid or has expired. Request a new one." };

  const user = await prisma.user.update({
    where: { id: row.userId },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      emailVerifiedAt: (await prisma.user.findUnique({ where: { id: row.userId } }))?.emailVerifiedAt ?? new Date(),
    },
  });
  await prisma.authToken.deleteMany({ where: { userId: user.id } });
  await claimInvites(user);

  redirect("/login?reset=1");
}

export async function verifyEmailAction(token: string) {
  const row = await peekToken(token, "verify_email");
  if (!row) redirect("/verify-email?token=invalid");

  const user = await prisma.user.update({
    where: { id: row.userId },
    data: { emailVerifiedAt: new Date() },
  });
  await consumeToken(row.id);
  await claimInvites(user);

  redirect("/login?verified=1");
}
