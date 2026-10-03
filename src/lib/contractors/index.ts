import { prisma } from "@/lib/prisma";
import { googlePlaces } from "./google-places";
import { sampleProvider } from "./sample";
import type { Business, ContractorProvider, GeoPoint } from "./provider";
import type { Trade } from "./trades";

export { TRADES, findTrade, tradeForItem, type Trade } from "./trades";

const RADIUS_METERS = 40_000; // about 25 miles
const SEARCHES_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

function provider(): ContractorProvider | null {
  if (process.env.CONTRACTOR_SEARCH === "sample") return sampleProvider();
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return key ? googlePlaces(key) : null;
}

export const contractorSearchAvailable = () => provider() !== null;

// Google's terms only allow coordinates to be cached briefly, so geocodes stay in memory.
const geocodes = new Map<string, { point: GeoPoint | null; at: number }>();

async function locate(p: ContractorProvider, home: { address: string; latitude: number | null; longitude: number | null }) {
  if (home.latitude !== null && home.longitude !== null) return { lat: home.latitude, lng: home.longitude };
  const cached = geocodes.get(home.address);
  if (cached && Date.now() - cached.at < 24 * HOUR_MS) return cached.point;
  const point = await p.geocode(home.address);
  geocodes.set(home.address, { point, at: Date.now() });
  return point;
}

export function milesBetween(a: GeoPoint, b: GeoPoint) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export type Contractor = Business & { distanceMiles: number | null };
export type SearchOutcome = { ok: true; results: Contractor[]; attribution: string } | { ok: false; error: string };

// Local businesses for one trade around the property (never the viewer's own location).
export async function findContractors(opts: {
  userId: string;
  home: { id: string; address: string; latitude: number | null; longitude: number | null };
  trade: Trade;
}): Promise<SearchOutcome> {
  const p = provider();
  if (!p) return { ok: false, error: "Contractor search isn't set up yet." };

  const recent = await prisma.contractorSearch.count({
    where: { userId: opts.userId, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
  });
  if (recent >= SEARCHES_PER_HOUR) return { ok: false, error: "That's a lot of searches for one hour. Please try again a little later." };

  try {
    const center = await locate(p, opts.home);
    if (!center) return { ok: false, error: "We couldn't find this property's address on the map." };
    await prisma.contractorSearch.create({ data: { userId: opts.userId, homeId: opts.home.id, trade: opts.trade.key } });
    const businesses = await p.search(opts.trade.query, center, RADIUS_METERS);
    return {
      ok: true,
      attribution: p.attribution,
      results: businesses.map((b) => ({ ...b, distanceMiles: b.location ? milesBetween(center, b.location) : null })),
    };
  } catch (err) {
    console.error("Contractor search failed", err);
    return { ok: false, error: "Contractor search isn't available right now. Please try again shortly." };
  }
}
