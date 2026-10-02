// Calendar-day math in a user's timezone. The server runs in UTC, but "today" on a dashboard
// should mean today where the user is.

const FALLBACK_TIMEZONE = "America/New_York";

export function validTimezone(timezone: string | null | undefined) {
  if (!timezone) return FALLBACK_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

function zonedParts(t: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(t));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute"), s: get("second") };
}

// How far the timezone's wall clock is ahead of UTC at instant t.
function offsetMs(t: number, timezone: string) {
  const p = zonedParts(t, timezone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(t / 1000) * 1000;
}

// The instant the given local date starts. Day overflow (d + 1) is fine.
function startOfLocalDay(y: number, m: number, d: number, timezone: string) {
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(guess, timezone);
  // Re-check at the found instant in case a DST change sits between it and the guess.
  return new Date(guess - offsetMs(first, timezone));
}

// Start (inclusive) and end (exclusive) of the user's current calendar day.
export function todayBounds(timezone: string | null | undefined, now = new Date()) {
  const tz = validTimezone(timezone);
  const { y, m, d } = zonedParts(now.getTime(), tz);
  return { start: startOfLocalDay(y, m, d, tz), end: startOfLocalDay(y, m, d + 1, tz) };
}
