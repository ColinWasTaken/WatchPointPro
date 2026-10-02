import Link from "next/link";
import { CalendarDays, Home as HomeIcon, MapPin, Plus, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isAdmin, propertyScope, requireCompany } from "@/lib/authz";
import { clientName } from "@/lib/fields";
import { LocalTime } from "@/components/local-time";

const chip = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
    active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white"
  }`;

export default async function PropertiesPage(props: PageProps<"/dashboard/homewatcher/properties">) {
  const ctx = await requireCompany();
  const admin = isAdmin(ctx);
  const { show } = await props.searchParams;
  const unassignedOnly = admin && show === "unassigned";

  const properties = await prisma.home.findMany({
    where: { ...propertyScope(ctx), ...(unassignedOnly ? { assignedEmployeeId: null } : {}) },
    include: {
      client: true,
      assignedEmployee: { select: { name: true, email: true } },
      visits: { where: { scheduledFor: { gte: new Date() } }, orderBy: { scheduledFor: "asc" }, take: 1 },
    },
    orderBy: [{ city: "asc" }, { street: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Properties</h1>
          <p className="text-sm text-ink-muted">
            {admin ? "" : "Assigned to you · "}
            {properties.length} {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>
        {admin && (
          <Link
            href="/dashboard/homewatcher/properties/new"
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-strong"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Add property
          </Link>
        )}
      </div>

      {admin && (
        <div className="mt-4 flex gap-2">
          <Link href="/dashboard/homewatcher/properties" className={chip(!unassignedOnly)}>
            All
          </Link>
          <Link href="/dashboard/homewatcher/properties?show=unassigned" className={chip(unassignedOnly)}>
            Unassigned
          </Link>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-14 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <HomeIcon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-ink-muted">
            {unassignedOnly
              ? "Every property has someone assigned."
              : admin
                ? "No properties yet. Add a client, then add the properties you watch for them."
                : "No properties are assigned to you yet."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {properties.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/homewatcher/properties/${p.id}`}
                className="block h-full rounded-3xl bg-surface p-4 shadow-sm transition hover:shadow-md"
              >
                <p className="font-bold text-ink">{p.nickname}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {p.address}
                </p>
                {p.client && (
                  <p className="mt-2 text-xs text-ink-muted">
                    Client: <span className="font-semibold text-ink">{clientName(p.client)}</span>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  {admin &&
                    (p.assignedEmployee ? (
                      <span className="flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" strokeWidth={2} />
                        {p.assignedEmployee.name ?? p.assignedEmployee.email}
                      </span>
                    ) : (
                      <span className="rounded-full bg-pending-soft px-2.5 py-0.5 font-semibold text-pending">Unassigned</span>
                    ))}
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                    {p.visits[0] ? (
                      <>
                        Next check <LocalTime iso={p.visits[0].scheduledFor.toISOString()} style="weekday" />
                      </>
                    ) : (
                      "No check scheduled"
                    )}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
