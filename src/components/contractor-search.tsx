import { BackLink } from "./back-link";
import { ContractorList } from "./contractor-list";
import { TRADES, findContractors, type Trade } from "@/lib/contractors";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "Find professionals near my property": results for one trade around the property's address.
// Callers check that the viewer may see the property before rendering this.
export async function ContractorSearch({
  userId,
  home,
  trade,
  back,
  keep,
}: {
  userId: string;
  home: { id: string; nickname: string; address: string; latitude: number | null; longitude: number | null };
  trade: Trade;
  back: { href: string; label: string };
  keep: Record<string, string>; // query params to keep when switching trade
}) {
  const outcome = await findContractors({ userId, home, trade });

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={back.href} label={back.label} />
      <h1 className="mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">
        {capitalize(trade.plural)} near {home.nickname}
      </h1>
      <p className="text-sm text-ink-muted">Searching around {home.address}</p>

      <form method="get" className="mt-4 flex gap-2">
        {Object.entries(keep).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <select
          name="trade"
          defaultValue={trade.key}
          aria-label="Type of professional"
          className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
        >
          {TRADES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong">
          Search
        </button>
      </form>

      <div className="mt-5">
        {outcome.ok ? (
          outcome.results.length > 0 ? (
            <ContractorList results={outcome.results} />
          ) : (
            <p className="rounded-3xl bg-surface p-5 text-sm text-ink-muted shadow-sm">
              No {trade.plural} found near this property. Try another type of professional.
            </p>
          )
        ) : (
          <p className="rounded-3xl bg-surface p-5 text-sm text-ink-muted shadow-sm">{outcome.error}</p>
        )}
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        {outcome.ok && <>Results from {outcome.attribution}. </>}
        WatchPointPro doesn&apos;t recommend or vet these businesses. Check licensing, insurance, and reviews before hiring.
      </p>
    </div>
  );
}
