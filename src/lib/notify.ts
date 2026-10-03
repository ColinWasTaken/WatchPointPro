import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

type Mail = { subject: string; html: string };
type Note = { type: string; title: string; body?: string; link: string };
// Either may depend on the recipient's timezone (e.g. to show a visit time in their local time).
type ForRecipient<T> = T | ((timezone: string | null) => T);

const resolve = <T,>(value: ForRecipient<T>, timezone: string | null) =>
  typeof value === "function" ? (value as (tz: string | null) => T)(timezone) : value;

// Emails a user if they have notifications on and a confirmed address. Never throws: a failed
// notification must not fail the action that triggered it.
export async function notifyUser(userId: string | null | undefined, mail: ForRecipient<Mail>) {
  if (!userId) return; // e.g. a company-managed home whose owner has no account yet
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.notifyEmail || !user.emailVerifiedAt) return;
    await sendEmail({ to: user.email, ...resolve(mail, user.timezone) });
  } catch (err) {
    console.error("notifyUser failed", err);
  }
}

// Records an in-app notification (shown under the bell, opening `link`) and, if the user allows
// email, sends `email` too. Push notifications can later be another delivery for the same rows.
// Never throws.
export async function notify(userId: string | null | undefined, note: ForRecipient<Note>, email?: ForRecipient<Mail>) {
  if (!userId) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const { type, title, body, link } = resolve(note, user.timezone);
    await prisma.notification.create({ data: { userId, type, title, body: body ?? null, link } });
    if (email && user.notifyEmail && user.emailVerifiedAt) {
      await sendEmail({ to: user.email, ...resolve(email, user.timezone) });
    }
  } catch (err) {
    console.error("notify failed", err);
  }
}
