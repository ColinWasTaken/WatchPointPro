"use client";

import { useState } from "react";
import { Globe, Navigation, Phone, Star } from "lucide-react";
import type { Contractor } from "@/lib/contractors";

const SORTS = { best: "Best match", nearest: "Nearest", rating: "Top rated" } as const;
type Sort = keyof typeof SORTS;

function sorted(results: Contractor[], sort: Sort) {
  if (sort === "nearest") return [...results].sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
  if (sort === "rating") {
    return [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  }
  return results;
}

const directionsUrl = (c: Contractor) => {
  const destination = encodeURIComponent([c.name, c.address].filter(Boolean).join(", "));
  const placeId = c.id.startsWith("sample-") ? "" : `&destination_place_id=${encodeURIComponent(c.id)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${placeId}`;
};

const button =
  "flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-accent-soft text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white";
const unavailable = "flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-background text-sm text-ink-muted/60";

// Sorting happens here in the browser, so re-sorting doesn't cost another search.
export function ContractorList({ results }: { results: Contractor[] }) {
  const [sort, setSort] = useState<Sort>("best");

  return (
    <div>
      <div className="flex gap-2" role="radiogroup" aria-label="Sort">
        {(Object.keys(SORTS) as Sort[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={sort === key}
            onClick={() => setSort(key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              sort === key ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white"
            }`}
          >
            {SORTS[key]}
          </button>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {sorted(results, sort).map((c) => {
          const website = c.website && /^https?:\/\//i.test(c.website) ? c.website : null;
          return (
            <li key={c.id} className="rounded-3xl bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-ink">{c.name}</p>
                {c.rating !== null && (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">
                    <Star className="h-4 w-4 fill-pending text-pending" strokeWidth={1.5} />
                    {c.rating.toFixed(1)}
                    <span className="font-normal text-ink-muted">({c.reviewCount ?? 0})</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {c.distanceMiles !== null && <span className="font-semibold text-ink">{c.distanceMiles.toFixed(1)} mi · </span>}
                {c.address}
              </p>
              {c.phone && <p className="text-sm text-ink-muted">{c.phone}</p>}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {c.phone ? (
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className={button}>
                    <Phone className="h-4 w-4" strokeWidth={2} /> Call
                  </a>
                ) : (
                  <span className={unavailable}>No phone</span>
                )}
                {website ? (
                  <a href={website} target="_blank" rel="noopener noreferrer" className={button}>
                    <Globe className="h-4 w-4" strokeWidth={2} /> Website
                  </a>
                ) : (
                  <span className={unavailable}>No website</span>
                )}
                <a href={directionsUrl(c)} target="_blank" rel="noopener noreferrer" className={button}>
                  <Navigation className="h-4 w-4" strokeWidth={2} /> Directions
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
