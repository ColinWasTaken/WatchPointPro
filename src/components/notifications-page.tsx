import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { pushPublicKey } from "@/lib/push";
import { LocalTime } from "./local-time";
import { PushHint } from "./push-settings";

export async function NotificationsPage({ settingsHref }: { settingsHref: string }) {
  const session = await auth();
  if (!session) redirect("/login");
  const notes = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const publicKey = pushPublicKey();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[30px] leading-tight sm:text-[34px] text-ink">Notifications</h1>
        {notes.some((n) => !n.readAt) && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="text-sm font-semibold text-accent">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center shadow-sm">
          <Bell className="h-7 w-7 text-accent" strokeWidth={1.75} />
          <p className="text-sm text-ink-muted">You&apos;re all caught up. Updates like completed home checks will appear here.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {notes.map((n) => (
            <li key={n.id}>
              {/* A plain link: Next's Link would prefetch the URL and mark the notification read. */}
              <a
                href={`/notifications/${n.id}`}
                className={`flex gap-3 rounded-2xl px-4 py-3 shadow-sm transition hover:shadow-md ${n.readAt ? "bg-surface" : "bg-accent-soft"}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "" : "bg-accent"}`} aria-hidden />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">
                    {n.title}
                    {!n.readAt && <span className="sr-only"> (unread)</span>}
                  </span>
                  {n.body && <span className="block text-sm text-ink-muted">{n.body}</span>}
                  <span className="block text-xs text-ink-muted">
                    <LocalTime iso={n.createdAt.toISOString()} />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {publicKey && <PushHint publicKey={publicKey} settingsHref={settingsHref} />}
    </div>
  );
}
