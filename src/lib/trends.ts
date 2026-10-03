import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientName } from "@/lib/fields";
import { RANGED_KEYS, typicalRange, type ReadingRange } from "@/lib/inspection-template";

// Readings over time for one property: every checklist item that takes a reading (indoor
// temperature and humidity, and any a company added, like a wine fridge), from submitted checks
// in the last year. Items are grouped by key and unit, so a unit change never mixes scales.

export type Reading = { at: string; value: number };
export type Series = { key: string; label: string; unit: string; readings: Reading[]; range: ReadingRange | null };

const MAX_READINGS = 40;
const DAY = 24 * 60 * 60 * 1000;
const YEAR = 365 * DAY;
const ALERT_DAYS = 30;

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
    .map(({ key, label, unit, readings }) => ({ key, label, unit, readings: readings.slice(-MAX_READINGS), range: typicalRange(key, unit) }));
}

export type ReadingAlert = {
  homeId: string;
  nickname: string;
  client: string | null;
  label: string;
  value: number;
  unit: string;
  at: string;
  range: ReadingRange;
};

// For a company's dashboard: properties whose latest check (in the last month) found the indoor
// temperature or humidity outside the typical range, furthest out first.
export async function readingAlerts(properties: Prisma.HomeWhereInput): Promise<ReadingAlert[]> {
  const homes = await prisma.home.findMany({
    where: properties,
    select: {
      id: true,
      nickname: true,
      client: { select: { firstName: true, lastName: true } },
      inspections: {
        where: { status: "submitted" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          submittedAt: true,
          items: { where: { key: { in: RANGED_KEYS }, reading: { not: null } }, select: { key: true, label: true, reading: true, readingUnit: true } },
        },
      },
    },
  });

  const since = Date.now() - ALERT_DAYS * DAY;
  const found: { alert: ReadingAlert; off: number }[] = [];
  for (const home of homes) {
    const latest = home.inspections[0];
    if (!latest?.submittedAt || latest.submittedAt.getTime() < since) continue;
    for (const item of latest.items) {
      const range = typicalRange(item.key, item.readingUnit);
      if (!range || item.reading === null || !item.readingUnit) continue;
      // How far outside, as a share of the range, so the worst comes first.
      const off = Math.max(item.reading - range.high, range.low - item.reading, 0) / (range.high - range.low);
      if (off === 0) continue;
      found.push({
        alert: {
          homeId: home.id,
          nickname: home.nickname,
          client: home.client ? clientName(home.client) : null,
          label: item.label,
          value: item.reading,
          unit: item.readingUnit,
          at: latest.submittedAt.toISOString(),
          range,
        },
        off,
      });
    }
  }
  return found.sort((a, b) => b.off - a.off).map((f) => f.alert);
}
