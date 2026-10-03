import { prisma } from "@/lib/prisma";

// Readings over time for one property: every checklist item that takes a reading (indoor
// temperature and humidity, and any a company added, like a wine fridge), from submitted checks
// in the last year. Items are grouped by key and unit, so a unit change never mixes scales.

export type Reading = { at: string; value: number };
export type Range = { low: number; high: number; why: string };
export type Series = { key: string; label: string; unit: string; readings: Reading[]; range: Range | null };

const MAX_READINGS = 40;
const YEAR = 365 * 24 * 60 * 60 * 1000;

// What's usual in a home nobody is living in, for the standard items.
const TYPICAL: Record<string, Range & { unit: string }> = {
  humidity: { unit: "%", low: 30, high: 60, why: "Above 60%, mold and mildew can start to grow." },
  temperature: { unit: "°F", low: 55, high: 85, why: "Outside this range, the AC or heat may not be keeping up." },
};

export async function readingTrends(homeId: string): Promise<Series[]> {
  const items = await prisma.inspectionItem.findMany({
    where: {
      reading: { not: null },
      readingUnit: { not: null },
      inspection: { homeId, status: "submitted", submittedAt: { gte: new Date(Date.now() - YEAR) } },
    },
    select: { key: true, label: true, readingUnit: true, reading: true, position: true, inspection: { select: { submittedAt: true } } },
    orderBy: { inspection: { submittedAt: "asc" } },
  });

  const groups = new Map<string, { key: string; label: string; unit: string; position: number; readings: Reading[] }>();
  for (const item of items) {
    if (item.reading === null || !item.readingUnit || !item.inspection.submittedAt) continue;
    const id = `${item.key}\u0000${item.readingUnit}`;
    const group = groups.get(id) ?? { key: item.key, label: item.label, unit: item.readingUnit, position: item.position, readings: [] };
    // The newest check names the item and decides where it sits, as on the checklist.
    group.label = item.label;
    group.position = item.position;
    group.readings.push({ at: item.inspection.submittedAt.toISOString(), value: item.reading });
    groups.set(id, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.position - b.position)
    .map(({ key, label, unit, readings }) => {
      const typical = TYPICAL[key];
      return {
        key,
        label,
        unit,
        readings: readings.slice(-MAX_READINGS),
        range: typical && typical.unit === unit ? { low: typical.low, high: typical.high, why: typical.why } : null,
      };
    });
}
