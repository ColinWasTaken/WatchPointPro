const RESEND_URL = process.env.RESEND_API_URL ?? "https://api.resend.com/emails";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function appUrl() {
  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;
  return (process.env.APP_URL ?? fromVercel ?? "http://localhost:3001").replace(/\/$/, "");
}

function toPlainText(html: string) {
  return html
    .replace(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2: $1")
    .replace(/<\/(p|h2|div)>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!isEmailConfigured()) return false;

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "HomeWatch <onboarding@resend.dev>",
      to,
      subject,
      html,
      text: toPlainText(html),
    }),
  });

  if (!res.ok) {
    console.error("Email send failed", res.status, await res.text());
    return false;
  }
  return true;
}

function layout(heading: string, body: string, buttonLabel: string, href: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#362f27">
  <h2 style="margin:0 0 12px">${heading}</h2>
  <p style="line-height:1.5">${body}</p>
  <p style="margin:24px 0"><a href="${href}" style="background:#6b8a63;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${buttonLabel}</a></p>
  <p style="font-size:12px;color:#8a7f71">If the button doesn't work, paste this link into your browser:<br>${href}</p>
</div>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export const emails = {
  verify: (link: string) => ({
    subject: "Confirm your HomeWatch email",
    html: layout("Confirm your email", "Thanks for signing up for HomeWatch. Confirm your email address to finish setting up your account. This link expires in 24 hours.", "Confirm email", link),
  }),
  reset: (link: string) => ({
    subject: "Reset your HomeWatch password",
    html: layout("Reset your password", "We got a request to reset your password. This link expires in 1 hour. If you didn't ask for this, you can ignore this email.", "Choose a new password", link),
  }),
  invite: (ownerName: string, homeName: string, link: string) => ({
    subject: `${ownerName} invited you to watch ${homeName}`,
    html: layout("You're invited", `${esc(ownerName)} invited you to be a homewatcher for <b>${esc(homeName)}</b> on HomeWatch. Create a homewatcher account with this email address and the invitation will be waiting for you.`, "Get started", link),
  }),
  inviteExisting: (ownerName: string, homeName: string, link: string) => ({
    subject: `${ownerName} invited you to watch ${homeName}`,
    html: layout("New invitation", `${esc(ownerName)} invited you to be a homewatcher for <b>${esc(homeName)}</b>. Sign in to accept or decline.`, "View invitation", link),
  }),
};
