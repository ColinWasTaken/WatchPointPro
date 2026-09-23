"use client";

import { useEffect, useState } from "react";

type Style = "datetime" | "date" | "weekday";

const OPTIONS: Record<Style, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: "medium", timeStyle: "short" },
  date: { dateStyle: "medium" },
  weekday: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
};

// Formats in the viewer's own timezone (server components only know the server's).
export function LocalTime({ iso, style = "datetime" }: { iso: string; style?: Style }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(new Intl.DateTimeFormat(undefined, OPTIONS[style]).format(new Date(iso)));
  }, [iso, style]);

  return <time dateTime={iso}>{text ?? " "}</time>;
}
