"use client";

import { useEffect } from "react";
import { useOffline } from "next/offline";
import { WifiOff } from "lucide-react";

// Registers the service worker (production only: in development it would get in the way of hot reload).
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-pending px-4 py-2 text-center text-sm font-semibold text-white">
      <WifiOff className="h-4 w-4 shrink-0" strokeWidth={2.25} />
      You&apos;re offline. Changes will sync when you&apos;re back online.
    </div>
  );
}
