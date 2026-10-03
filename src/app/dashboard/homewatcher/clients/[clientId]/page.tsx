import Link from "next/link";
import { KeyRound, Mail, MapPin, Phone, Plus } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ClientForm, SendInvitationButton } from "@/components/company-forms";
import { ConfirmButton } from "@/components/confirm-button";
import { LocalTime } from "@/components/local-time";
import { getClientOr404, isAdmin, propertyScope, requireCompany } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { clientName } from "@/lib/fields";
import { deleteClientAction, updateClientAction } from "@/lib/actions/company";
import {
  cancelClientInvitationAction,
  removeClientAccessAction,
  sendClientInvitationAction,
} from "@/lib/actions/invitations";

const outlineButton =
  "rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-danger hover:text-danger";

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

  const [account, pending, joined] = await Promise.all([
    client.userId ? prisma.user.findUnique({ where: { id: client.userId }, select: { email: true } }) : null,
    prisma.invitation.findFirst({ where: { clientId: client.id, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
    client.userId
      ? prisma.invitation.findFirst({
          where: { clientId: client.id, acceptedAt: { not: null } },
          orderBy: { acceptedAt: "desc" },
        })
      : null,
  ]);
  const pendingOpen = pending && pending.expiresAt > new Date() ? pending : null;
  const sendInvitation = sendClientInvitationAction.bind(null, client.id);

  return (
    <div className="mx-auto max-w-lg">
      <BackLink href="/dashboard/homewatcher/clients" label="Back to clients" />
      <h1 className="mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">{clientName(client)}</h1>
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

      <section className="mt-6 rounded-3xl bg-surface p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 font-bold text-ink">
          <KeyRound className="h-4 w-4 text-accent" strokeWidth={2} />
          WatchPointPro access
        </h2>
        {account ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              {client.firstName} has an account ({account.email}) and can see their properties&apos; reports.
              {joined?.acceptedAt && (
                <>
                  {" "}
                  Joined <LocalTime iso={joined.acceptedAt.toISOString()} style="date" />.
                </>
              )}
            </p>
            {admin && (
              <form action={removeClientAccessAction.bind(null, client.id)} className="mt-3">
                <ConfirmButton
                  message={`Remove ${clientName(client)}'s access? They'll stop seeing these properties in WatchPointPro.`}
                  className={outlineButton}
                >
                  Remove access
                </ConfirmButton>
              </form>
            )}
          </>
        ) : pendingOpen ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              Invitation sent to {pendingOpen.email} on <LocalTime iso={pendingOpen.createdAt.toISOString()} style="date" />.
              The link expires <LocalTime iso={pendingOpen.expiresAt.toISOString()} style="date" />.
            </p>
            {admin && (
              <div className="mt-3 flex flex-wrap items-start gap-2">
                <SendInvitationButton action={sendInvitation} label="Resend invitation" />
                <form action={cancelClientInvitationAction.bind(null, client.id)}>
                  <ConfirmButton message="Cancel this invitation? The link in the email will stop working." className={outlineButton}>
                    Cancel invitation
                  </ConfirmButton>
                </form>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              {pending ? (
                <>
                  The invitation sent on <LocalTime iso={pending.createdAt.toISOString()} style="date" /> expired.
                </>
              ) : !client.email ? (
                admin ? `Add an email address below to invite ${client.firstName}.` : "No email address on file."
              ) : (
                `${client.firstName} doesn't have access yet. Send an invitation so they can see their properties' home-check reports.`
              )}
            </p>
            {admin && client.email && (
              <div className="mt-3">
                <SendInvitationButton action={sendInvitation} label={pending ? "Send a new invitation" : "Send invitation"} />
              </div>
            )}
          </>
        )}
      </section>

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
