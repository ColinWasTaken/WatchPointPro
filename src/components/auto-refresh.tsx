"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Reloads the page's data every so often while it's on screen, so new messages show up without a
// refresh. What's being typed is kept.
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
