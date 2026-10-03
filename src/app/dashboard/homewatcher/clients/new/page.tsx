import { BackLink } from "@/components/back-link";
import { ClientForm } from "@/components/company-forms";
import { requireCompanyAdmin } from "@/lib/authz";
import { createClientAction } from "@/lib/actions/company";

export default async function NewClientPage() {
  await requireCompanyAdmin();
  return (
    <div className="mx-auto max-w-lg">
      <BackLink href="/dashboard/homewatcher/clients" label="Back to clients" />
      <h1 className="mb-6 mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">Add a client</h1>
      <ClientForm action={createClientAction} submitLabel="Add client" />
    </div>
  );
}
