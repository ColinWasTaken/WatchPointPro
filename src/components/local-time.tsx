"use client";

import { useSyncExternalStore } from "react";

type Style = "datetime" | "date" | "longDate" | "weekday" | "time" | "relative";

const OPTIONS: Record<Exclude<Style, "relative">, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: "medium", timeStyle: "short" },
  date: { dateStyle: "medium" },
  longDate: { dateStyle: "long" },
  weekday: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  time: { hour: "numeric", minute: "2-digit" },
};

// "today", "yesterday", or "on September 20" (with the year when it isn't this year).
function relativeDay(date: Date) {
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  const year = date.getFullYear() === now.getFullYear() ? undefined : "numeric";
  return `on ${new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year }).format(date)}`;
}

const format = (iso: string, style: Style) =>
  style === "relative" ? relativeDay(new Date(iso)) : new Intl.DateTimeFormat(undefined, OPTIONS[style]).format(new Date(iso));

const noSubscription = () => () => {};

// Formats in the viewer's own timezone, which the server doesn't know: the server render (and
// hydration) leaves it blank, and the browser fills it in straight after.
export function LocalTime({ iso, style = "datetime" }: { iso: string; style?: Style }) {
  const text = useSyncExternalStore(noSubscription, () => format(iso, style), () => null);
  return <time dateTime={iso}>{text ?? " "}</time>;
}
