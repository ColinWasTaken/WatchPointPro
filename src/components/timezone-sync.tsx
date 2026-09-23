"use client";

import { useEffect } from "react";
import { syncTimezoneAction } from "@/lib/actions/settings";

// Keeps the user's timezone current so emailed times match their clock. The server
// only writes when the value actually changed.
export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) void syncTimezoneAction(tz);
  }, []);
  return null;
}
