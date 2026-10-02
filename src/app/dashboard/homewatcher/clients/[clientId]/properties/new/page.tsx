import { BackLink } from "@/components/back-link";
import { PropertyForm } from "@/components/company-forms";
import { companyEmployees, getClientOr404, requireCompanyAdmin } from "@/lib/authz";
import { clientName } from "@/lib/fields";
import { createPropertyAction } from "@/lib/actions/company";

export default async function NewPropertyPage(
  props: PageProps<"/dashboard/homewatcher/clients/[clientId]/properties/new">,
) {
  const { clientId } = await props.params;
  const ctx = await requireCompanyAdmin();
  const client = await getClientOr404(ctx, clientId);
  const employees = await companyEmployees(ctx);

  return (
    <div className="mx-auto max-w-lg">
      <BackLink href={`/dashboard/homewatcher/clients/${client.id}`} label={`Back to ${clientName(client)}`} />
      <h1 className="mb-6 mt-4 text-2xl font-bold text-ink">Add a property for {clientName(client)}</h1>
      <PropertyForm action={createPropertyAction.bind(null, client.id)} submitLabel="Add property" employees={employees} />
    </div>
  );
}
