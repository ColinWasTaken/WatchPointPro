import Link from "next/link";
import { ChevronRight, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { latestMessage, threadPath, type ThreadAccess, type ThreadSide } from "@/lib/property-thread";
import { AutoRefresh } from "./auto-refresh";
import { LocalTime } from "./local-time";
import { PropertyMessageForm } from "./property-message-form";

const SHOWN = 100;

// The conversation about one property. This side's messages sit on the right.
export async function PropertyThread({ access }: { access: ThreadAccess }) {
  const { home, company, side, userId } = access;
  // Reading the thread clears its message notifications under the bell.
  await prisma.notification.updateMany({
    where: { userId, type: "message", link: threadPath(side, home.id), readAt: null },
    data: { readAt: new Date() },
  });
  const newestFirst = await prisma.propertyMessage.findMany({
    where: { homeId: home.id },
    orderBy: { createdAt: "desc" },
    take: SHOWN + 1,
    include: { author: { select: { name: true, email: true } } },
  });
  const older = newestFirst.length > SHOWN;
  const messages = newestFirst.slice(0, SHOWN).reverse();
  const ours = (m: { fromCompany: boolean }) => m.fromCompany === (side === "company");
  const who = (m: (typeof messages)[number]) => {
    if (m.authorId === userId) return "You";
    const name = m.author?.name ?? m.author?.email ?? (m.fromCompany ? "Someone" : "The homeowner");
    return m.fromCompany && side === "owner" ? `${name}, ${company.name}` : name;
  };

  return (
    <section className="mt-6">
      {older && <p className="mb-3 text-center text-xs text-ink-muted">Showing the latest {SHOWN} messages.</p>}
      {messages.length === 0 ? (
        <p className="rounded-3xl bg-surface p-6 text-sm text-ink-muted shadow-sm">
          {side === "owner"
            ? `No messages yet. Ask ${company.name} a question, or let them know about anything happening at the house.`
            : "No messages yet. Write to the homeowner about anything at the house."}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {messages.map((m) => (
            <li key={m.id} className={`flex flex-col ${ours(m) ? "items-end" : "items-start"}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  ours(m) ? "bg-accent text-white" : "bg-surface text-ink shadow-sm"
                }`}
              >
                {m.body}
              </p>
              <p className="mt-1 px-1 text-xs text-ink-muted">
                {who(m)} · <LocalTime iso={m.createdAt.toISOString()} style="datetime" />
              </p>
            </li>
          ))}
        </ol>
      )}
      <PropertyMessageForm
        homeId={home.id}
        placeholder={side === "owner" ? `Write to ${company.name}` : "Write to the homeowner"}
        hint={side === "owner" ? `${company.name} will get a notification.` : "They’ll get a notification."}
      />
      <div id="thread-end" />
      <AutoRefresh seconds={15} />
    </section>
  );
}

// The way into a property's thread, with the newest message.
export async function ThreadLink({ homeId, side, title, empty }: { homeId: string; side: ThreadSide; title: string; empty: string }) {
  const last = await latestMessage(homeId);
  const author = last && (last.author?.name ?? last.author?.email ?? null);
  return (
    <Link
      href={threadPath(side, homeId)}
      className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm transition hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <MessageSquare className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block truncate text-sm text-ink-muted">
          {last ? (
            <>
              {author ? `${author}: ` : ""}
              {last.body}
            </>
          ) : (
            empty
          )}
        </span>
      </span>
      {last && (
        <span className="shrink-0 text-xs text-ink-muted">
          <LocalTime iso={last.createdAt.toISOString()} style="relative" />
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={2} aria-hidden />
    </Link>
  );
}

// For homeowners: when the company is next coming by. Times only; notes on visits are for the team.
export async function UpcomingChecks({ homeId }: { homeId: string }) {
  const visits = await prisma.visit.findMany({
    where: { homeId, scheduledFor: { gte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: 3,
    select: { id: true, scheduledFor: true },
  });
  if (visits.length === 0) return null;
  return (
    <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="text-base text-ink">Upcoming checks</h2>
      <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ink">
        {visits.map((v) => (
          <li key={v.id}>
            <LocalTime iso={v.scheduledFor.toISOString()} style="weekday" />
          </li>
        ))}
      </ul>
    </section>
  );
}
