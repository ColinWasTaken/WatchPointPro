"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { emails, isEmailConfigured, sendEmail } from "@/lib/email";
import { cleanEmail, cleanPhone, cleanText } from "@/lib/fields";

export type InquiryState = {
  error?: string;
  sentTo?: string; // first name, once the request is in
  values?: Record<string, string>; // what was typed, kept when there's an error
};

const PER_HOUR = 5;
const PLANS = ["Not sure yet", "Monthly", "Every two weeks", "Weekly"];

// The website's booking form. Every request is saved, then emailed to CONTACT_INBOX when set, so
// none is lost if email isn't configured yet.
export async function requestConsultationAction(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const values = Object.fromEntries(
    ["name", "email", "phone", "location", "away", "plan", "message"].map((k) => [k, cleanText(formData.get(k), 2000)]),
  );
  const fail = (error: string): InquiryState => ({ error, values });

  // A field people can't see: bots fill it in. Pretend it worked so they don't adapt.
  if (cleanText(formData.get("website"), 200)) return { sentTo: "there" };

  const name = cleanText(formData.get("name"), 100).replace(/\s+/g, " ");
  if (!name) return fail("Please tell us your name.");
  const email = cleanEmail(formData.get("email"));
  if (!email) return fail("Please enter an email address we can reply to.");
  const phoneRaw = cleanText(formData.get("phone"), 30);
  const phone = phoneRaw ? cleanPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return fail("That phone number doesn’t look right. Leave it blank if you’d rather we email.");
  const plan = cleanText(formData.get("plan"), 40);

  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ipHash = createHash("sha256").update(`${forwarded.split(",")[0].trim()}|${process.env.AUTH_SECRET ?? ""}`).digest("hex");
  const recent = await prisma.inquiry.count({ where: { ipHash, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= PER_HOUR) return fail("We already have several requests from you. We’ll be in touch soon.");

  const inquiry = await prisma.inquiry.create({
    data: {
      name,
      email,
      phone,
      location: cleanText(formData.get("location"), 200) || null,
      away: cleanText(formData.get("away"), 200) || null,
      plan: PLANS.includes(plan) ? plan : null,
      message: cleanText(formData.get("message"), 2000) || null,
      ipHash,
    },
  });

  const inbox = process.env.CONTACT_INBOX;
  if (inbox && isEmailConfigured()) {
    await sendEmail({ to: inbox, replyTo: email, ...emails.newInquiry(inquiry) });
  } else {
    console.warn("Consultation request saved, but CONTACT_INBOX or email isn't configured", inquiry.id);
  }

  return { sentTo: name.split(/\s+/)[0] };
}
