"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { forgetThisDevice } from "@/components/push-settings";

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        // Clear pages this phone saved for offline use, so the next person can't open them, and stop
        // this account's notifications coming to it.
        navigator.serviceWorker?.controller?.postMessage("sign-out");
        await forgetThisDevice();
        signOut({ callbackUrl: "/" });
      }}
      className="flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
      Sign out
    </button>
  );
}
