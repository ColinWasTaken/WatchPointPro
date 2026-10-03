import { brandOf } from "@/lib/brand";

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
  replyTo,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  fromName?: string; // shown as "<fromName> via WatchPointPro"
}) {
  if (!isEmailConfigured()) return false;
  const from = process.env.EMAIL_FROM ?? "WatchPointPro <onboarding@resend.dev>";
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from.trim();
  const name = fromName?.replace(/["\\<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 60); // no line breaks or quotes in a header

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: name ? `"${name} via WatchPointPro" <${address}>` : from,
      to,
      subject,
      html,
      text: toPlainText(html),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    console.error("Email send failed", res.status, await res.text());
    return false;
  }
  return true;
}

// A company writing to its homeowners: shown with its color, logo, and name, and replies go to it.
type FromCompany = { name: string; brandColor: string | null; logoUrl: string | null; email: string | null };

const fromCompany = (company: FromCompany) => ({ fromName: company.name, ...(company.email ? { replyTo: company.email } : {}) });

function layout(heading: string, body: string, buttonLabel: string, href: string, company?: FromCompany) {
  const brand = brandOf(company?.brandColor);
  const button = brand ? `background:${brand.color};color:${brand.ink}` : "background:#3e5a49;color:#fff";
  const letterhead = company
    ? `<div style="border-top:4px solid ${brand?.color ?? "#3e5a49"};padding-top:16px;margin-bottom:20px">${
        company.logoUrl
          ? `<img src="${esc(company.logoUrl)}" alt="" width="40" height="40" style="border-radius:10px;vertical-align:middle;margin-right:10px">`
          : ""
      }<span style="vertical-align:middle;font-size:16px;font-weight:bold">${esc(company.name)}</span></div>`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d2b36">
  ${letterhead}<h2 style="margin:0 0 12px">${heading}</h2>
  <p style="line-height:1.5">${body}</p>
  <p style="margin:24px 0"><a href="${href}" style="${button};padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${buttonLabel}</a></p>
  <p style="font-size:12px;color:#5b6670">If the button doesn't work, paste this link into your browser:<br>${href}</p>
</div>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function formatWhen(date: Date, timezone?: string | null) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone || "America/New_York",
  }).format(date);
}

export const emails = {
  newReport: (watcher: string, home: string, status: string, link: string) => ({
    subject: `${status === "ok" ? "New report" : status === "urgent" ? "URGENT report" : "Report needs attention"}: ${home}`,
    html: layout(
      "New visit report",
      `${esc(watcher)} submitted a report for <b>${esc(home)}</b>. Status: <b>${esc(status)}</b>.`,
      "View report",
      link,
    ),
  }),
  companyMessage: (company: FromCompany, sender: string, home: string, snippet: string, link: string) => ({
    subject: `New message from ${oneLine(company.name)} about ${oneLine(home)}`,
    html: layout("New message", `<b>${esc(sender)}</b> wrote about ${esc(home)}: "${esc(snippet)}"`, "Open messages", link, company),
    ...fromCompany(company),
  }),
  newMessage: (sender: string, home: string, snippet: string, link: string) => ({
    subject: `New message from ${sender} about ${home}`,
    html: layout("New message", `<b>${esc(sender)}</b> (${esc(home)}): "${esc(snippet)}"`, "Open conversation", link),
  }),
  visitScheduled: (by: string, home: string, when: string, link: string) => ({
    subject: `Visit scheduled for ${home}`,
    html: layout("Visit scheduled", `${esc(by)} scheduled a visit to <b>${esc(home)}</b> for ${esc(when)}.`, "View schedule", link),
  }),
  visitReminder: (home: string, address: string, when: string, link: string) => ({
    subject: `Reminder: visit to ${home} coming up`,
    html: layout("Visit reminder", `You have a visit to <b>${esc(home)}</b> (${esc(address)}) on ${esc(when)}.`, "Open home", link),
  }),
  invitationAccepted: (watcher: string, home: string, link: string) => ({
    subject: `${watcher} accepted your invitation`,
    html: layout("Invitation accepted", `${esc(watcher)} is now watching <b>${esc(home)}</b>.`, "View home", link),
  }),

  verify: (link: string) => ({
    subject: "Confirm your WatchPointPro email",
    html: layout("Confirm your email", "Thanks for signing up for WatchPointPro. Confirm your email address to finish setting up your account. This link expires in 24 hours.", "Confirm email", link),
  }),
  reset: (link: string) => ({
    subject: "Reset your WatchPointPro password",
    html: layout("Reset your password", "We got a request to reset your password. This link expires in 1 hour. If you didn't ask for this, you can ignore this email.", "Choose a new password", link),
  }),
  invite: (ownerName: string, homeName: string, link: string) => ({
    subject: `${ownerName} invited you to watch ${homeName}`,
    html: layout("You're invited", `${esc(ownerName)} invited you to be a homewatcher for <b>${esc(homeName)}</b> on WatchPointPro. Create a homewatcher account with this email address and the invitation will be waiting for you.`, "Get started", link),
  }),
  clientInvite: (company: FromCompany, firstName: string, link: string, days: number) => ({
    subject: `${oneLine(company.name)} invited you to WatchPointPro`,
    html: layout(
      `${esc(company.name)} invited you`,
      `Hi ${esc(firstName)}, ${esc(company.name)} uses WatchPointPro to provide digital home-check reports. Create your account to view inspections, photos, videos, and property updates.<br><br>This invitation expires in ${days} days.`,
      "Accept invitation",
      link,
      company,
    ),
    ...fromCompany(company),
  }),
  clientJoined: (client: string, link: string) => ({
    subject: `${oneLine(client)} accepted your invitation`,
    html: layout("Invitation accepted", `<b>${esc(client)}</b> created their WatchPointPro account and can now see their properties.`, "View client", link),
  }),
  inspectionCompleted: (company: FromCompany, place: string, outcome: string, link: string) => ({
    subject: `Your home check at ${oneLine(place)} has been completed`,
    html: layout("Home check completed", `${esc(company.name)} completed a home check at <b>${esc(place)}</b>. ${esc(outcome)}`, "View report", link, company),
    ...fromCompany(company),
  }),
  issueResolved: (company: FromCompany, issue: string, place: string, link: string) => ({
    subject: `Resolved: ${oneLine(issue)} at ${oneLine(place)}`,
    html: layout("Issue resolved", `${esc(company.name)} marked <b>${esc(issue)}</b> at ${esc(place)} as resolved.`, "View issue", link, company),
    ...fromCompany(company),
  }),
  employeeInvite: (company: string, inviter: string, link: string, days: number) => ({
    subject: `${oneLine(inviter)} invited you to join ${oneLine(company)} on WatchPointPro`,
    html: layout(
      `Join ${esc(company)}`,
      `${esc(inviter)} invited you to join the <b>${esc(company)}</b> team on WatchPointPro, where you'll see your assigned properties and home checks.<br><br>This invitation expires in ${days} days.`,
      "Accept invitation",
      link,
    ),
  }),
  employeeJoined: (name: string, company: string, link: string) => ({
    subject: `${oneLine(name)} joined your team`,
    html: layout("New team member", `<b>${esc(name)}</b> accepted your invitation and joined ${esc(company)} on WatchPointPro.`, "View team", link),
  }),
  inviteExisting: (ownerName: string, homeName: string, link: string) => ({
    subject: `${ownerName} invited you to watch ${homeName}`,
    html: layout("New invitation", `${esc(ownerName)} invited you to be a homewatcher for <b>${esc(homeName)}</b>. Sign in to accept or decline.`, "View invitation", link),
  }),
};
