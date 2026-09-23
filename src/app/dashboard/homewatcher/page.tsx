import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Binoculars, Home as HomeIcon, MapPin, Mail } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HomeActivity } from "@/components/home-activity";
import {
  acceptAssignmentAction,
  declineAssignmentAction,
} from "@/lib/actions/assignments";

export default async function HomewatcherDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const assignments = await prisma.homeAssignment.findMany({
    where: { homewatcherId: session.user.id },
    include: {
      home: {
        include: {
          owner: true,
          reports: { orderBy: { createdAt: "desc" }, take: 1 },
          visits: { where: { scheduledFor: { gte: new Date() } }, orderBy: { scheduledFor: "asc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = assignments.filter((a) => a.status === "pending");
  const accepted = assignments.filter((a) => a.status === "accepted");

  return (
    <div>
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-ink">Invitations</h2>
          <div className="mt-3 flex flex-col gap-3">
            {pending.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-2xl bg-pending-soft px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {assignment.home.nickname}
                  </p>
                  <p className="flex items-center gap-1 text-sm text-ink-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    {assignment.home.address}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Invited by{" "}
                    {assignment.home.owner.name ?? assignment.home.owner.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await acceptAssignmentAction(assignment.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                    >
                      Accept
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await declineAssignmentAction(assignment.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-ink-muted shadow-sm transition-colors hover:text-ink"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-ink">Homes you watch</h1>

      {accepted.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-14 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Binoculars className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-ink-muted">
            You&apos;re not watching any homes yet. Once a homeowner invites
            you and you accept, homes will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accepted.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/dashboard/homewatcher/homes/${assignment.home.id}`}
              className="rounded-3xl bg-surface p-4 shadow-sm transition hover:shadow-md"
            >
              {assignment.home.photoUrl ? (
                <Image
                  src={assignment.home.photoUrl}
                  alt={assignment.home.nickname}
                  width={400}
                  height={160}
                  className="mb-3 h-32 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <HomeIcon className="h-8 w-8" strokeWidth={1.5} />
                </div>
              )}
              <h2 className="font-bold text-ink">{assignment.home.nickname}</h2>
              <p className="flex items-center gap-1 text-sm text-ink-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                {assignment.home.address}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
                <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                {assignment.home.owner.name ?? assignment.home.owner.email}
              </p>
              <HomeActivity
                lastReport={assignment.home.reports[0] ?? null}
                nextVisit={assignment.home.visits[0]?.scheduledFor ?? null}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
