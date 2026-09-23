import Link from "next/link";
import { Home as HomeIcon } from "lucide-react";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export function DashboardHeader({
  homeHref,
  userEmail,
}: {
  homeHref: string;
  userEmail: string;
}) {
  return (
    <header className="flex items-center justify-between bg-surface px-6 py-4 shadow-sm">
      <Link href={homeHref} className="flex items-center gap-2 text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <HomeIcon className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="text-lg font-bold">HomeWatch</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-ink-muted sm:inline">{userEmail}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
