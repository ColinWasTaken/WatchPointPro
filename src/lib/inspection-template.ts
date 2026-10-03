// The home-check checklist. Items are copied onto each inspection when it starts, so changing this
// list later doesn't alter past reports.

export type TemplateItem = { key: string; label: string; readingUnit?: string };

export const DEFAULT_INSPECTION_ITEMS: TemplateItem[] = [
  { key: "ac", label: "AC operating" },
  { key: "temperature", label: "Indoor temperature", readingUnit: "°F" },
  { key: "humidity", label: "Indoor humidity", readingUnit: "%" },
  { key: "pool", label: "Pool condition" },
  { key: "generator", label: "Generator" },
  { key: "roof", label: "Roof / exterior" },
  { key: "plumbing", label: "Plumbing / leaks" },
  { key: "appliances", label: "Appliances" },
  { key: "doors", label: "Doors" },
  { key: "windows", label: "Windows" },
  { key: "landscaping", label: "Landscaping" },
  { key: "pests", label: "Pest signs" },
  { key: "electrical", label: "Electrical" },
  { key: "water", label: "Water" },
  { key: "other", label: "Other" },
];

export const ITEM_STATUSES = ["good", "needs_attention", "repair_needed", "not_checked"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const isItemStatus = (value: unknown): value is ItemStatus =>
  typeof value === "string" && (ITEM_STATUSES as readonly string[]).includes(value);

export const STATUS_LABEL: Record<ItemStatus, string> = {
  good: "Good",
  needs_attention: "Needs attention",
  repair_needed: "Repair needed",
  not_checked: "Not checked",
};

export type OutcomeLevel = "good" | "attention" | "repair";

const items = (n: number) => (n === 1 ? "one item" : `${n} items`);

// The overall result of a check, e.g. "Everything looks good except one item requiring attention."
export function inspectionOutcome(list: { status: string | null }[]) {
  const repair = list.filter((i) => i.status === "repair_needed").length;
  const attention = list.filter((i) => i.status === "needs_attention").length;
  const level: OutcomeLevel = repair ? "repair" : attention ? "attention" : "good";

  let sentence = "Everything looks good.";
  if (repair) {
    const first = `${repair === 1 ? "One item needs" : `${repair} items need`} repair`;
    sentence = attention ? `${first}, and ${items(attention)} ${attention === 1 ? "requires" : "require"} attention.` : `${first}.`;
  } else if (attention) {
    sentence = `Everything looks good except ${items(attention)} requiring attention.`;
  }
  return { level, repair, attention, sentence };
}
