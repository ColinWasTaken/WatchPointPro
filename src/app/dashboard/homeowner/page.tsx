import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Home as HomeIcon, MapPin, Plus, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HomeActivity } from "@/components/home-activity";

export default async function HomeownerDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const homes = await prisma.home.findMany({
    where: { ownerId: session.user.id },
    include: {
      assignments: { where: { status: "accepted" } },
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
      visits: { where: { scheduledFor: { gte: new Date() } }, orderBy: { scheduledFor: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

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

      {homes.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-14 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <HomeIcon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-ink-muted">
            You haven&apos;t added any homes yet. Add your first home to get
            started.
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
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent">
                <Users className="h-3.5 w-3.5" strokeWidth={2} />
                {home.assignments.length === 0
                  ? "No homewatcher assigned"
                  : `${home.assignments.length} homewatcher${home.assignments.length > 1 ? "s" : ""} assigned`}
              </p>
              <HomeActivity lastReport={home.reports[0] ?? null} nextVisit={home.visits[0]?.scheduledFor ?? null} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
