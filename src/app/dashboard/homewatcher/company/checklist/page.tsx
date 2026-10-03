import { BackLink } from "@/components/back-link";
import { ChecklistList, CompanyChecklistEditor } from "@/components/company-checklist-editor";
import { isAdmin, requireCompany } from "@/lib/authz";
import { companyChecklist } from "@/lib/checklist";
import { DEFAULT_INSPECTION_ITEMS } from "@/lib/inspection-template";

export default async function ChecklistPage() {
  const ctx = await requireCompany();
  const { items, custom } = await companyChecklist(ctx.company.id);

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/dashboard/homewatcher/company" label={`Back to ${ctx.company.name}`} />
      <h1 className="mt-3 text-2xl font-bold text-ink">Home check checklist</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Every home check goes through these items, in this order. Items with a reading ask for a number, like the indoor
        temperature. Checks already started keep the list they began with.
      </p>
      {isAdmin(ctx) ? (
        <CompanyChecklistEditor initial={items} custom={custom} standard={DEFAULT_INSPECTION_ITEMS} />
      ) : (
        <>
          <ChecklistList items={items} />
          <p className="mt-3 text-sm text-ink-muted">Only admins can change the checklist.</p>
        </>
      )}
    </div>
  );
}
