import Link from "next/link";
import { Mail, MapPin, Phone, Plus } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ClientForm } from "@/components/company-forms";
import { ConfirmButton } from "@/components/confirm-button";
import { getClientOr404, isAdmin, propertyScope, requireCompany } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { clientName } from "@/lib/fields";
import { deleteClientAction, updateClientAction } from "@/lib/actions/company";

export default async function ClientPage(props: PageProps<"/dashboard/homewatcher/clients/[clientId]">) {
  const { clientId } = await props.params;
  const ctx = await requireCompany();
  const client = await getClientOr404(ctx, clientId);
  const admin = isAdmin(ctx);

  const properties = await prisma.home.findMany({
    where: { clientId: client.id, ...propertyScope(ctx) },
    include: { assignedEmployee: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg">
      <BackLink href="/dashboard/homewatcher/clients" label="Back to clients" />
      <h1 className="mt-4 text-2xl font-bold text-ink">{clientName(client)}</h1>
      <div className="mt-1 flex flex-col gap-0.5 text-sm text-ink-muted">
        {client.email && (
          <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-accent">
            <Mail className="h-3.5 w-3.5" strokeWidth={2} /> {client.email}
          </a>
        )}
        {client.phone && (
          <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-accent">
            <Phone className="h-3.5 w-3.5" strokeWidth={2} /> {client.phone}
          </a>
        )}
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">Properties</h2>
        {admin && (
          <Link
            href={`/dashboard/homewatcher/clients/${client.id}/properties/new`}
            className="flex items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-strong"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Add property
          </Link>
        )}
      </div>
      {properties.length === 0 ? (
        <p className="rounded-3xl bg-surface p-5 text-sm text-ink-muted shadow-sm">No properties yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {properties.map((p) => (
            <li key={p.id} className="rounded-3xl bg-surface p-4 shadow-sm">
              <Link href={`/dashboard/homewatcher/properties/${p.id}`} className="font-semibold text-ink hover:text-accent">
                {p.nickname}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {p.address}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {p.assignedEmployee ? `Assigned to ${p.assignedEmployee.name ?? p.assignedEmployee.email}` : "Unassigned"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {admin && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Client details</h2>
          <ClientForm action={updateClientAction.bind(null, client.id)} submitLabel="Save changes" client={client} />
          <div className="mt-8 rounded-3xl bg-surface p-5 shadow-sm">
            <h3 className="font-bold text-danger">Delete client</h3>
            {properties.length > 0 ? (
              <p className="mt-1 text-sm text-ink-muted">Remove this client&apos;s properties first.</p>
            ) : (
              <form action={deleteClientAction.bind(null, client.id)} className="mt-2">
                <ConfirmButton
                  message={`Delete ${clientName(client)}?`}
                  className="rounded-full border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-white"
                >
                  Delete client
                </ConfirmButton>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
