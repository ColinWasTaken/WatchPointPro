import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DEFAULT_INSPECTION_ITEMS, type TemplateItem } from "@/lib/inspection-template";

// Each company can have its own home check checklist; until it makes one, it uses the standard
// list. New checks copy the list when they start, so editing it never changes past reports.

export const CHECKLIST_LIMITS = { items: 40, label: 60, unit: 10 };

export async function companyChecklist(companyId: string): Promise<{ items: TemplateItem[]; custom: boolean }> {
  const rows = await prisma.checklistTemplateItem.findMany({ where: { companyId }, orderBy: { position: "asc" } });
  if (rows.length === 0) return { items: DEFAULT_INSPECTION_ITEMS, custom: false };
  return {
    items: rows.map((r) => ({ key: r.key, label: r.label, ...(r.readingUnit ? { readingUnit: r.readingUnit } : {}) })),
    custom: true,
  };
}

const newKey = (taken: Set<string>) => {
  let key: string;
  do key = `custom-${randomBytes(4).toString("hex")}`;
  while (taken.has(key));
  return key;
};

const oneLine = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

// Checks an edited checklist. An item keeps its key if it's one we know (a standard item or one
// already in the company's list), so renaming keeps issues and contractor trades attached to it;
// anything else is a new item and gets a new key.
export function cleanChecklist(input: unknown, knownKeys: Set<string>): { items: TemplateItem[] } | { error: string } {
  if (!Array.isArray(input)) return { error: "Something went wrong. Reload the page and try again." };
  if (input.length === 0) return { error: "A checklist needs at least one item." };
  if (input.length > CHECKLIST_LIMITS.items) return { error: `Keep the checklist to ${CHECKLIST_LIMITS.items} items or fewer.` };

  const items: TemplateItem[] = [];
  const labels = new Set<string>();
  const keys = new Set<string>();
  for (const row of input) {
    if (!row || typeof row !== "object") return { error: "Something went wrong. Reload the page and try again." };
    const { key: rawKey, label: rawLabel, unit: rawUnit } = row as Record<string, unknown>;
    const label = oneLine(rawLabel);
    if (!label) return { error: "Every item needs a name." };
    if (label.length > CHECKLIST_LIMITS.label) {
      return { error: `“${label.slice(0, 24)}…” is too long. Item names can be up to ${CHECKLIST_LIMITS.label} characters.` };
    }
    if (labels.has(label.toLowerCase())) return { error: `Two items are called “${label}”. Give each its own name.` };
    labels.add(label.toLowerCase());
    const unit = oneLine(rawUnit);
    if (unit.length > CHECKLIST_LIMITS.unit) {
      return { error: `The reading unit for “${label}” is too long. Use up to ${CHECKLIST_LIMITS.unit} characters, like “ppm”.` };
    }
    const key = typeof rawKey === "string" && knownKeys.has(rawKey) && !keys.has(rawKey) ? rawKey : newKey(keys);
    keys.add(key);
    items.push({ key, label, ...(unit ? { readingUnit: unit } : {}) });
  }
  return { items };
}

// Whether a list is exactly the standard one, in which case nothing needs storing.
export const isStandard = (items: TemplateItem[]) =>
  items.length === DEFAULT_INSPECTION_ITEMS.length &&
  items.every((item, i) => {
    const standard = DEFAULT_INSPECTION_ITEMS[i];
    return item.key === standard.key && item.label === standard.label && (item.readingUnit ?? null) === (standard.readingUnit ?? null);
  });
