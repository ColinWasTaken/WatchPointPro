import Link from "next/link";
import { Bell, Home as HomeIcon } from "lucide-react";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { DashboardNav, type NavVariant } from "./dashboard-nav";
import { TimezoneSync } from "./timezone-sync";
import { OfflineBanner } from "./offline";

export function DashboardHeader({
  homeHref,
  userEmail,
  nav,
  unread,
}: {
  homeHref: string;
  userEmail: string;
  nav: NavVariant;
  unread: number;
}) {
  return (
    <>
    <TimezoneSync />
    <OfflineBanner />
    <header className="flex items-center justify-between bg-surface px-6 pb-2 pt-4">
      <Link href={homeHref} className="flex items-center gap-2 text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <HomeIcon className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="text-lg font-bold">WatchPointPro</span>
      </Link>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="hidden text-sm text-ink-muted sm:inline">{userEmail}</span>
        <Link
          href={`${homeHref}/notifications`}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-white"
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <SignOutButton />
      </div>
    </header>
    <DashboardNav variant={nav} />
    </>
  );
}
