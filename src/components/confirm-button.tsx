"use client";

import type { ReactNode } from "react";

// A submit button that asks for confirmation first. Put it inside a <form action={...}>.
export function ConfirmButton({
  message,
  className,
  children,
  ariaLabel,
}: {
  message: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
