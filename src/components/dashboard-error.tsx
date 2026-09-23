"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export function DashboardError({
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
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-14 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pending-soft text-pending">
        <TriangleAlert className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <p className="font-semibold text-ink">Something went wrong</p>
      <p className="max-w-sm text-sm text-ink-muted">
        We hit a snag loading this. Give it another try.
      </p>
      <button
        onClick={reset}
        className="mt-1 flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        <RotateCcw className="h-4 w-4" strokeWidth={2} />
        Try again
      </button>
    </div>
  );
}
