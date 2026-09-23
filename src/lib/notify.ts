import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

type Mail = { subject: string; html: string };

// Emails a user if they have notifications on and a confirmed address. Pass a function
// to build the message from the recipient's timezone. Never throws: a failed
// notification must not fail the action that triggered it.
export async function notifyUser(userId: string, mail: Mail | ((timezone: string | null) => Mail)) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.notifyEmail || !user.emailVerifiedAt) return;
    await sendEmail({ to: user.email, ...(typeof mail === "function" ? mail(user.timezone) : mail) });
  } catch (err) {
    console.error("notifyUser failed", err);
  }
}
