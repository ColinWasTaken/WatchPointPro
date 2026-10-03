"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/authz";
import { DEFAULT_INSPECTION_ITEMS, type TemplateItem } from "@/lib/inspection-template";
import { cleanChecklist, companyChecklist, isStandard } from "@/lib/checklist";

export type ChecklistResult = { error?: string; success?: string; items?: TemplateItem[]; custom?: boolean };

const PAGE = "/dashboard/homewatcher/company/checklist";

// Replaces the company's checklist with an edited one. Admins only.
export async function saveChecklistAction(items: unknown): Promise<ChecklistResult> {
  const ctx = await requireCompanyAdmin();
  const current = await prisma.checklistTemplateItem.findMany({ where: { companyId: ctx.company.id }, select: { key: true } });
  const known = new Set([...DEFAULT_INSPECTION_ITEMS.map((i) => i.key), ...current.map((c) => c.key)]);
  const cleaned = cleanChecklist(items, known);
  if ("error" in cleaned) return { error: cleaned.error };

  // An unchanged standard list is stored as no list, so it stays "standard".
  const rows = isStandard(cleaned.items) ? [] : cleaned.items;
  await prisma.$transaction([
    prisma.checklistTemplateItem.deleteMany({ where: { companyId: ctx.company.id } }),
    prisma.checklistTemplateItem.createMany({
      data: rows.map((item, position) => ({
        companyId: ctx.company.id,
        key: item.key,
        label: item.label,
        readingUnit: item.readingUnit ?? null,
        position,
      })),
    }),
  ]);
  revalidatePath(PAGE);
  return { success: "Saved. New home checks will use this checklist.", ...(await companyChecklist(ctx.company.id)) };
}

export async function resetChecklistAction(): Promise<ChecklistResult> {
  const ctx = await requireCompanyAdmin();
  await prisma.checklistTemplateItem.deleteMany({ where: { companyId: ctx.company.id } });
  revalidatePath(PAGE);
  return { success: "Back to the standard checklist.", items: DEFAULT_INSPECTION_ITEMS, custom: false };
}
