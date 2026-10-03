import Link from "next/link";
import { MapPin } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { PropertyForm } from "@/components/company-forms";
import { ConfirmButton } from "@/components/confirm-button";
import { ReadingTrends } from "@/components/reading-trends";
import { ThreadLink } from "@/components/property-thread";
import { VisitsSection } from "@/components/visits-section";
import { HomeCheckPanel } from "./home-check-panel";
import { companyEmployees, getPropertyOr404, isAdmin, requireCompany } from "@/lib/authz";
import { clientName } from "@/lib/fields";
import { deletePropertyAction, updatePropertyAction } from "@/lib/actions/company";
import { readingTrends } from "@/lib/trends";

export default async function PropertyPage(props: PageProps<"/dashboard/homewatcher/properties/[homeId]">) {
  const { homeId } = await props.params;
  const ctx = await requireCompany();
  const property = await getPropertyOr404(ctx, homeId);
  const admin = isAdmin(ctx);
  const [employees, trends] = await Promise.all([admin ? companyEmployees(ctx) : [], readingTrends(property.id)]);

  return (
    <div className="mx-auto max-w-lg">
      <BackLink
        href={property.client ? `/dashboard/homewatcher/clients/${property.client.id}` : "/dashboard/homewatcher/clients"}
        label={property.client ? `Back to ${clientName(property.client)}` : "Back to clients"}
      />
      <h1 className="mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">{property.nickname}</h1>
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(property.address)}`}
        target="_blank"
        rel="noreferrer"
        className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {property.address}
      </a>
      {property.client && (
        <p className="mt-1 text-sm text-ink-muted">
          Owner:{" "}
          <Link href={`/dashboard/homewatcher/clients/${property.client.id}`} className="font-semibold hover:text-accent">
            {clientName(property.client)}
          </Link>
        </p>
      )}
      <p className="mt-1 text-sm text-ink-muted">
        {property.assignedEmployee
          ? `Assigned to ${property.assignedEmployee.name ?? property.assignedEmployee.email}`
          : "No team member assigned"}
      </p>

      <HomeCheckPanel homeId={property.id} />

      <ThreadLink
        homeId={property.id}
        side="company"
        title={`Messages with ${property.client ? clientName(property.client) : "the homeowner"}`}
        empty={property.ownerId ? "Write to the homeowner about anything at the house." : "Messages reach the homeowner once they have an account."}
      />

      <VisitsSection
        homeId={property.id}
        title="Scheduled checks"
        submitLabel="Schedule check"
        canCancel={(visit) => admin || visit.createdById === ctx.userId}
      />

      <ReadingTrends series={trends} />

      {admin ? (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Property details</h2>
          <div>
            <PropertyForm
              action={updatePropertyAction.bind(null, property.id)}
              submitLabel="Save changes"
              employees={employees}
              property={property}
            />
          </div>
          <div className="mt-8 rounded-3xl bg-surface p-5 shadow-sm">
            <h3 className="font-bold text-danger">Delete property</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Permanently removes this property and its home-check reports, photos, and videos.
            </p>
            <form action={deletePropertyAction.bind(null, property.id)} className="mt-2">
              <ConfirmButton
                message={`Delete ${property.nickname}? Its home-check reports, photos, and videos will be deleted too.`}
                className="rounded-full border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-white"
              >
                Delete property
              </ConfirmButton>
            </form>
          </div>
        </>
      ) : (
        property.notes && (
          <div className="mt-6 rounded-3xl bg-surface p-5 text-sm text-ink shadow-sm">
            <h3 className="mb-1 font-bold">Notes</h3>
            {property.notes}
          </div>
        )
      )}
    </div>
  );
}
