import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/back-link";
import { PropertyForm } from "@/components/company-forms";
import { companyEmployees, requireCompanyAdmin } from "@/lib/authz";
import { clientName } from "@/lib/fields";
import { createPropertyFromFormAction } from "@/lib/actions/company";

export default async function NewPropertyPage() {
  const ctx = await requireCompanyAdmin();
  const [clients, employees] = await Promise.all([
    prisma.client.findMany({
      where: { companyId: ctx.company.id },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    companyEmployees(ctx),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <BackLink href="/dashboard/homewatcher/properties" label="Back to properties" />
      <h1 className="mb-6 mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">Add a property</h1>
      {clients.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 text-sm text-ink-muted shadow-sm">
          Every property belongs to a client.{" "}
          <Link href="/dashboard/homewatcher/clients/new" className="font-semibold text-accent">
            Add your first client
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <PropertyForm
          action={createPropertyFromFormAction}
          submitLabel="Add property"
          employees={employees}
          clients={clients.map((c) => ({ id: c.id, name: clientName(c) }))}
        />
      )}
    </div>
  );
}
