import { formatReading } from "@/lib/inspection-template";
import type { Series } from "@/lib/trends";
import { LocalTime } from "./local-time";

// Readings over time, one card per item: the latest reading, a line through every reading with
// the typical range shaded behind it, and the readings themselves in a table for anyone who wants
// the numbers (or can't see the chart).

const W = 600;
const H = 150;
const PAD_X = 10;
const PAD_Y = 12;

function Chart({ series }: { series: Series }) {
  const { readings, range, unit, label } = series;
  const values = readings.map((r) => r.value);
  let lo = Math.min(...values, ...(range ? [range.low] : []));
  let hi = Math.max(...values, ...(range ? [range.high] : []));
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;

  const times = readings.map((r) => new Date(r.at).getTime());
  const [first, last] = [times[0], times[times.length - 1]];
  const x = (t: number) => PAD_X + ((t - first) / (last - first || 1)) * (W - 2 * PAD_X);
  const y = (v: number) => PAD_Y + ((hi - v) / (hi - lo)) * (H - 2 * PAD_Y);
  const outside = (v: number) => range !== null && (v < range.low || v > range.high);
  const path = readings.map((r, i) => `${i ? "L" : "M"}${x(times[i]).toFixed(1)} ${y(r.value).toFixed(1)}`).join(" ");
  const percent = (v: number) => `${((y(v) / H) * 100).toFixed(2)}%`;

  return (
    <div className="mt-3 flex gap-2">
      {/* The band and line stretch with the card; the dots sit on top at the same size everywhere. */}
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`${label}: ${readings.length} readings from ${formatReading(Math.min(...values), unit)} to ${formatReading(Math.max(...values), unit)}.`}
        >
          {range && <rect x={0} width={W} y={y(range.high)} height={y(range.low) - y(range.high)} rx={8} className="fill-accent-soft" />}
          <path d={path} className="fill-none stroke-accent" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {readings.map((r, i) => (
          <span
            key={i}
            aria-hidden
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${
              i === readings.length - 1 ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
            } ${outside(r.value) ? "bg-danger" : "bg-accent"}`}
            style={{ left: `${((x(times[i]) / W) * 100).toFixed(2)}%`, top: percent(r.value) }}
          />
        ))}
      </div>
      {range && (
        // The range's ends, level with the band.
        <div aria-hidden className="relative w-10 shrink-0 text-[11px] tabular-nums text-ink-muted">
          <span className="absolute -translate-y-1/2" style={{ top: percent(range.high) }}>
            {formatReading(range.high, unit)}
          </span>
          <span className="absolute -translate-y-1/2" style={{ top: percent(range.low) }}>
            {formatReading(range.low, unit)}
          </span>
        </div>
      )}
    </div>
  );
}

function SeriesCard({ series }: { series: Series }) {
  const { readings, range, unit, label } = series;
  const latest = readings[readings.length - 1];
  const above = range ? readings.filter((r) => r.value > range.high).length : 0;
  const below = range ? readings.filter((r) => r.value < range.low).length : 0;
  const latestOutside = range !== null && (latest.value > range.high || latest.value < range.low);

  return (
    <div className="rounded-3xl bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{label}</h3>
          {range && (
            <p className="text-xs text-ink-muted">
              Typical for an empty home: {range.low}–{formatReading(range.high, unit)}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-bold tabular-nums ${latestOutside ? "text-danger" : "text-ink"}`}>
            {formatReading(latest.value, unit)}
          </p>
          <p className="text-xs text-ink-muted">
            <LocalTime iso={latest.at} style="date" />
          </p>
        </div>
      </div>

      {readings.length > 1 ? (
        <>
          <Chart series={series} />
          <div className={`mt-1 flex justify-between text-xs text-ink-muted ${range ? "mr-12" : ""}`}>
            <LocalTime iso={readings[0].at} style="date" />
            <LocalTime iso={latest.at} style="date" />
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">One reading so far. The trend appears after the next check.</p>
      )}

      {range && readings.length > 1 && (
        <p className={`mt-3 text-sm ${above || below ? "text-danger" : "text-ink-muted"}`}>
          {above || below
            ? [
                above && `${above} of ${readings.length} readings above ${formatReading(range.high, unit)}.`,
                below && `${below} of ${readings.length} readings below ${formatReading(range.low, unit)}.`,
                range.why,
              ]
                .filter(Boolean)
                .join(" ")
            : `All ${readings.length} readings within the typical range.`}
        </p>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold text-accent">All readings ({readings.length})</summary>
        <table className="mt-2 w-full text-sm">
          <thead className="sr-only">
            <tr>
              <th>Date</th>
              <th>{label}</th>
            </tr>
          </thead>
          <tbody>
            {[...readings].reverse().map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1.5 text-ink-muted">
                  <LocalTime iso={r.at} style="date" />
                </td>
                <td className={`py-1.5 text-right tabular-nums ${range && (r.value > range.high || r.value < range.low) ? "text-danger" : "text-ink"}`}>
                  {formatReading(r.value, unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function ReadingTrends({ series }: { series: Series[] }) {
  if (series.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-ink">Readings over time</h2>
      <p className="text-sm text-ink-muted">From each home check in the last year.</p>
      <div className="mt-3 flex flex-col gap-3">
        {series.map((s) => (
          <SeriesCard key={`${s.key}|${s.unit}`} series={s} />
        ))}
      </div>
    </section>
  );
}
