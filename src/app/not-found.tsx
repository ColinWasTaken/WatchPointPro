import Link from "next/link";
import { Home as HomeIcon, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <SearchX className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h1 className="text-2xl font-bold text-ink">We couldn&apos;t find that</h1>
      <p className="max-w-sm text-ink-muted">
        This page doesn&apos;t exist, or you may not have access to it.
      </p>
      <Link
        href="/"
        className="mt-2 flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        <HomeIcon className="h-4 w-4" strokeWidth={2} />
        Back to HomeWatch
      </Link>
    </div>
  );
}
