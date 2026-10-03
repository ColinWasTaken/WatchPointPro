"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { appUrl, emails } from "@/lib/email";
import { cleanText } from "@/lib/fields";
import { notify } from "@/lib/notify";
import { threadAccess, threadPath } from "@/lib/property-thread";

export type MessageState = { error?: string; body?: string };

const MAX_LENGTH = 2000;
const BURST_MS = 10 * 60 * 1000;

const clip = (text: string) => (text.length > 140 ? `${text.slice(0, 139)}…` : text);

// Posts to a property's thread and lets the other side know: the company's admins and the assigned
// team member when the homeowner writes, the homeowner when someone at the company does.
export async function sendPropertyMessageAction(homeId: string, _prev: MessageState, formData: FormData): Promise<MessageState> {
  const access = await threadAccess(homeId);
  if (!access) return { error: "This conversation isn’t available." };
  const raw = String(formData.get("body") ?? "");
  const body = cleanText(raw, MAX_LENGTH + 1);
  if (!body) return { error: "Write a message first." };
  if (body.length > MAX_LENGTH) return { error: `Messages can be up to ${MAX_LENGTH} characters.`, body: raw };

  const { home, company, side, userId } = access;
  const previous = await prisma.propertyMessage.findFirst({ where: { homeId }, orderBy: { createdAt: "desc" } });
  await prisma.propertyMessage.create({ data: { homeId, authorId: userId, fromCompany: side === "company", body } });

  // Several messages in a row from the same person notify once.
  const burst = previous?.authorId === userId && Date.now() - previous.createdAt.getTime() < BURST_MS;
  if (!burst) {
    const author = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const name = author?.name ?? author?.email ?? "Someone";
    if (side === "owner") {
      const admins = await prisma.companyMember.findMany({ where: { companyId: company.id, role: "admin" }, select: { userId: true } });
      const recipients = new Set([...admins.map((a) => a.userId), home.assignedEmployeeId].filter((id): id is string => Boolean(id)));
      recipients.delete(userId);
      const link = threadPath("company", homeId);
      await Promise.all(
        [...recipients].map((id) =>
          notify(
            id,
            { type: "message", title: `Message from ${name} about ${home.nickname}`, body: clip(body), link },
            emails.newMessage(name, home.nickname, clip(body), `${appUrl()}${link}`),
          ),
        ),
      );
    } else if (home.ownerId) {
      const link = threadPath("owner", homeId);
      await notify(
        home.ownerId,
        { type: "message", title: `Message from ${company.name}`, body: `${name}: ${clip(body)}`, link },
        emails.companyMessage(company, name, home.nickname, clip(body), `${appUrl()}${link}`),
      );
    }
  }

  revalidatePath(threadPath("owner", homeId));
  revalidatePath(threadPath("company", homeId));
  revalidatePath(`/dashboard/homeowner/homes/${homeId}`);
  revalidatePath(`/dashboard/homewatcher/properties/${homeId}`);
  return {};
}
