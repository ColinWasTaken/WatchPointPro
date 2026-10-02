import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MapPin, Plus, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HomeActivity } from "@/components/home-activity";
import { clientScope, getCompanyContext, isAdmin, propertyScope } from "@/lib/authz";
import { clientName } from "@/lib/fields";

export default async function ClientsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const ctx = await getCompanyContext(session.user.id);
  const companyClients = ctx
    ? await prisma.client.findMany({
        where: clientScope(ctx),
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: { homes: { where: propertyScope(ctx), orderBy: { createdAt: "asc" } } },
      })
    : [];

  const assignments = await prisma.homeAssignment.findMany({
    where: { homewatcherId: session.user.id, status: "accepted" },
    include: {
      home: {
        include: {
          owner: true,
          reports: { orderBy: { createdAt: "desc" }, take: 1 },
          visits: { where: { scheduledFor: { gte: new Date() } }, orderBy: { scheduledFor: "asc" }, take: 1 },
        },
      },
    },
  });

  const clients = new Map<string, { owner: NonNullable<(typeof assignments)[number]["home"]["owner"]>; homes: (typeof assignments)[number]["home"][] }>();
  for (const a of assignments) {
    if (!a.home.ownerId || !a.home.owner) continue;
    const entry = clients.get(a.home.ownerId) ?? { owner: a.home.owner, homes: [] };
    entry.homes.push(a.home);
    clients.set(a.home.ownerId, entry);
  }
  const list = [...clients.values()].sort((a, b) => (a.owner.name ?? a.owner.email).localeCompare(b.owner.name ?? b.owner.email));

  const companySection = !ctx ? (
    <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink">Run a home-watch business?</h2>
      <p className="text-sm text-ink-muted">
        Set up your company to manage your own clients and the properties you watch for them.
      </p>
      <Link
        href="/dashboard/homewatcher/company"
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
      >
        Set up your company
      </Link>
    </div>
  ) : (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{ctx.company.name}</h2>
        {isAdmin(ctx) && (
          <Link
            href="/dashboard/homewatcher/clients/new"
            className="flex items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-strong"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Add client
          </Link>
        )}
      </div>
      {companyClients.length === 0 ? (
        <p className="rounded-3xl bg-surface p-5 text-sm text-ink-muted shadow-sm">
          {isAdmin(ctx) ? "No clients yet. Add your first client to start adding their properties." : "No properties are assigned to you yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {companyClients.map((c) => (
            <li key={c.id} className="rounded-3xl bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/dashboard/homewatcher/clients/${c.id}`} className="font-bold text-ink hover:text-accent">
                  {clientName(c)}
                </Link>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                  {c.homes.length} {c.homes.length === 1 ? "property" : "properties"}
                </span>
              </div>
              {c.email && <p className="text-sm text-ink-muted">{c.email}</p>}
              {c.homes.map((h) => (
                <Link
                  key={h.id}
                  href={`/dashboard/homewatcher/properties/${h.id}`}
                  className="mt-2 flex items-center gap-1.5 rounded-2xl bg-background px-3 py-2 text-sm text-ink-muted hover:text-accent"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {h.address}
                </Link>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Your clients</h1>
      {companySection}

      <h2 className="mt-10 text-lg font-bold text-ink">Homeowners who invited you</h2>
      <p className="text-sm text-ink-muted">
        {list.length} {list.length === 1 ? "client" : "clients"} · {assignments.length} {assignments.length === 1 ? "home" : "homes"}
      </p>

      {list.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-14 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Users className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-ink-muted">Homeowners you watch for will show up here, with their homes and addresses.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {list.map(({ owner, homes }) => (
            <section key={owner.id} className="rounded-3xl bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-ink">{owner.name ?? owner.email}</h2>
                  <a href={`mailto:${owner.email}`} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent">
                    <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                    {owner.email}
                  </a>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                  {homes.length} {homes.length === 1 ? "home" : "homes"}
                </span>
              </div>

              <ul className="mt-4 flex flex-col gap-3">
                {homes.map((home) => (
                  <li key={home.id} className="rounded-2xl bg-background p-4">
                    <Link href={`/dashboard/homewatcher/homes/${home.id}`} className="font-semibold text-ink hover:text-accent">
                      {home.nickname}
                    </Link>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(home.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                      {home.address}
                    </a>
                    <HomeActivity lastReport={home.reports[0] ?? null} nextVisit={home.visits[0]?.scheduledFor ?? null} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
