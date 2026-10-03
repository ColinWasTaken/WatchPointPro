import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Home as HomeIcon, MapPin, Plus, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HomeActivity } from "@/components/home-activity";
import { LocalTime } from "@/components/local-time";
import { OutcomeBadge } from "@/components/inspection-report";

export default async function HomeownerDashboardPage(props: PageProps<"/dashboard/homeowner">) {
  const { joined } = await props.searchParams;
  const session = await auth();
  if (!session) redirect("/login");

  const homes = await prisma.home.findMany({
    where: { ownerId: session.user.id },
    include: {
      company: { select: { name: true } },
      _count: { select: { issues: { where: { status: { not: "resolved" } } } } },
      inspections: {
        where: { status: "submitted" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        include: { items: { select: { status: true } } },
      },
      assignments: { where: { status: "accepted" } },
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
      visits: { where: { scheduledFor: { gte: new Date() } }, orderBy: { scheduledFor: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  // Companies this homeowner is a client of, to explain an empty list after joining one.
  const companies =
    homes.length === 0
      ? await prisma.client.findMany({ where: { userId: session.user.id }, select: { company: { select: { name: true } } } })
      : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Your homes</h1>
        <Link
          href="/dashboard/homeowner/homes/new"
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Home
        </Link>
      </div>

      {joined && (
        <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
          You&apos;re all set. Reports from your home-watch company will show up here.
        </p>
      )}

      {homes.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-14 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <HomeIcon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-ink-muted">
            {companies.length > 0
              ? `${companies.map((c) => c.company.name).join(" and ")} hasn't added your property yet. It will show up here once they do.`
              : "You haven't added any homes yet. Add your first home to get started."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {homes.map((home) => (
            <Link
              key={home.id}
              href={`/dashboard/homeowner/homes/${home.id}`}
              className="rounded-3xl bg-surface p-4 shadow-sm transition hover:shadow-md"
            >
              {home.photoUrl ? (
                <Image
                  src={home.photoUrl}
                  alt={home.nickname}
                  width={400}
                  height={160}
                  className="mb-3 h-32 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <HomeIcon className="h-8 w-8" strokeWidth={1.5} />
                </div>
              )}
              <h2 className="font-bold text-ink">{home.nickname}</h2>
              <p className="flex items-center gap-1 text-sm text-ink-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                {home.address}
              </p>
              {home.company ? (
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent">
                  <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
                  Managed by {home.company.name}
                </p>
              ) : (
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent">
                  <Users className="h-3.5 w-3.5" strokeWidth={2} />
                  {home.assignments.length === 0
                    ? "No homewatcher assigned"
                    : `${home.assignments.length} homewatcher${home.assignments.length > 1 ? "s" : ""} assigned`}
                </p>
              )}
              {home.company ? (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                  {home.inspections[0] ? (
                    <>
                      Checked <LocalTime iso={(home.inspections[0].submittedAt ?? home.inspections[0].startedAt).toISOString()} style="relative" />
                      <OutcomeBadge items={home.inspections[0].items} />
                    </>
                  ) : (
                    "Not checked yet"
                  )}
                  {home._count.issues > 0 && (
                    <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold text-danger">
                      {home._count.issues} open {home._count.issues === 1 ? "issue" : "issues"}
                    </span>
                  )}
                </p>
              ) : (
                <HomeActivity lastReport={home.reports[0] ?? null} nextVisit={home.visits[0]?.scheduledFor ?? null} />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
