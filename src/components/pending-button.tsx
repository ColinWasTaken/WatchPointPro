"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// A submit button that shows pendingLabel while its form's action runs.
export function PendingButton({ children, pendingLabel, className }: { children: ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
