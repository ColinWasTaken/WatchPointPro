"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pending-soft text-pending">
        <TriangleAlert className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="max-w-sm text-ink-muted">
        We hit a snag loading this page. Give it another try.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-accent-soft"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
