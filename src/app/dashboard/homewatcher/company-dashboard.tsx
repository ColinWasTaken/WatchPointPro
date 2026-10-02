import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Check, ClipboardCheck, Home as HomeIcon, TriangleAlert, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { clientScope, isAdmin, propertyScope, type CompanyContext } from "@/lib/authz";
import { clientName } from "@/lib/fields";
import { todayBounds } from "@/lib/time";
import { LocalTime } from "@/components/local-time";

const DAY_MS = 24 * 60 * 60 * 1000;
const hw = "/dashboard/homewatcher";

function Stat({ href, label, value, icon: Icon }: { href: string; label: string; value: number; icon: LucideIcon }) {
  return (
    <Link href={href} className="rounded-3xl bg-surface p-4 shadow-sm transition hover:shadow-md">
      <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs font-semibold text-ink-muted">{label}</p>
    </Link>
  );
}

function GettingStarted({ clients, teamSize }: { clients: number; teamSize: number }) {
  const steps = [
    { done: clients > 0, label: "Add your first client", href: `${hw}/clients/new` },
    { done: false, label: "Add a property for them", href: `${hw}/properties/new` },
    { done: teamSize > 1, label: "Invite your team", href: `${hw}/team` },
  ];
  return (
    <section className="mt-6 rounded-3xl bg-surface p-5 shadow-sm">
      <h2 className="font-bold text-ink">Get started</h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link href={s.href} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  s.done ? "bg-accent text-white" : "bg-accent-soft text-accent"
                }`}
              >
                {s.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={s.done ? "text-ink-muted line-through" : "font-semibold text-ink hover:text-accent"}>{s.label}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-ink-muted">
        Then invite each client from their page so they can see their home-check reports.
      </p>
    </section>
  );
}

// Today's work at a glance. Admins see the whole company; employees see their assigned properties.
export async function CompanyDashboard({ ctx, joined }: { ctx: CompanyContext; joined: boolean }) {
  const admin = isAdmin(ctx);
  const scope = propertyScope(ctx);
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { timezone: true } });
  const { start, end } = todayBounds(user?.timezone);
  const weekEnd = new Date(end.getTime() + 7 * DAY_MS);

  const [properties, clients, todaysChecks, upcoming, teamSize, unassigned] = await Promise.all([
    prisma.home.count({ where: scope }),
    prisma.client.count({ where: clientScope(ctx) }),
    prisma.visit.findMany({
      where: { scheduledFor: { gte: start, lt: end }, home: scope },
      orderBy: { scheduledFor: "asc" },
      include: { home: { include: { client: true, assignedEmployee: { select: { name: true, email: true } } } } },
    }),
    prisma.visit.count({ where: { scheduledFor: { gte: end, lt: weekEnd }, home: scope } }),
    admin ? prisma.companyMember.count({ where: { companyId: ctx.company.id } }) : 0,
    admin ? prisma.home.count({ where: { companyId: ctx.company.id, assignedEmployeeId: null } }) : 0,
  ]);

  return (
    <div>
      <p className="text-sm font-semibold text-ink-muted">{ctx.company.name}</p>
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>

      {joined && (
        <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
          Welcome to {ctx.company.name}!{" "}
          {admin ? "You can manage clients, properties, and the team." : "Properties assigned to you will show up here."}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat href={`${hw}/properties`} label={admin ? "Properties" : "Your properties"} value={properties} icon={HomeIcon} />
        <Stat href={`${hw}/clients`} label="Clients" value={clients} icon={Users} />
        <Stat href="#today" label="Checks today" value={todaysChecks.length} icon={ClipboardCheck} />
        <Stat href={`${hw}/schedule`} label="Next 7 days" value={upcoming} icon={CalendarDays} />
      </div>

      {admin && unassigned > 0 && (
        <Link
          href={`${hw}/properties?show=unassigned`}
          className="mt-4 flex items-center gap-2 rounded-2xl bg-pending-soft px-4 py-3 text-sm font-semibold text-pending"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={2} />
          {unassigned} {unassigned === 1 ? "property has" : "properties have"} no one assigned
        </Link>
      )}

      {admin && properties === 0 && <GettingStarted clients={clients} teamSize={teamSize} />}

      <section id="today" className="mt-8 scroll-mt-4">
        <h2 className="text-lg font-bold text-ink">Today&apos;s checks</h2>
        {todaysChecks.length === 0 ? (
          <p className="mt-2 rounded-3xl bg-surface p-5 text-sm text-ink-muted shadow-sm">
            No checks scheduled for today. Schedule checks from a property&apos;s page.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {todaysChecks.map((v) => (
              <li key={v.id}>
                <Link
                  href={`${hw}/properties/${v.homeId}`}
                  className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:shadow-md"
                >
                  <span className="w-16 shrink-0 pt-0.5 text-sm font-bold text-accent">
                    <LocalTime iso={v.scheduledFor.toISOString()} style="time" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{v.home.nickname}</span>
                    <span className="block truncate text-sm text-ink-muted">{v.home.address}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {[
                        v.home.client && clientName(v.home.client),
                        admin && (v.home.assignedEmployee ? (v.home.assignedEmployee.name ?? v.home.assignedEmployee.email) : "Unassigned"),
                        v.note,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
