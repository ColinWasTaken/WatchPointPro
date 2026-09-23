import Link from "next/link";
import { Home as HomeIcon, Binoculars } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 bg-background px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <HomeIcon className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          HomeWatch
        </h1>
        <p className="text-ink-muted">Who&apos;s checking in today?</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <Link
          href="/login?role=homeowner"
          className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong"
        >
          <HomeIcon className="h-5 w-5" strokeWidth={2} />
          I&apos;m a Homeowner
        </Link>
        <Link
          href="/login?role=homewatcher"
          className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-surface px-6 text-lg font-semibold text-ink shadow-sm transition-colors hover:bg-accent-soft"
        >
          <Binoculars className="h-5 w-5" strokeWidth={2} />
          I&apos;m a Homewatcher
        </Link>
      </div>
    </div>
  );
}
