"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
      Sign out
    </button>
  );
}
