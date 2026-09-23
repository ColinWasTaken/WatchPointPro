import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Home as HomeIcon, MapPin, NotebookPen, Pencil, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UpdatesFeed } from "@/components/updates-feed";
import { MessageComposer } from "@/components/message-composer";
import { VisitsSection } from "@/components/visits-section";
import { StatusBadge } from "@/components/status-badge";
import { BackLink } from "@/components/back-link";
import { ConfirmButton } from "@/components/confirm-button";
import { removeAssignmentAction, cancelInviteAction } from "@/lib/actions/homes";
import { InviteForm } from "./invite-form";
import { DeleteHomeForm } from "./delete-home-form";

export default async function HomeDetailPage(
  props: PageProps<"/dashboard/homeowner/homes/[homeId]">,
) {
  const { homeId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const home = await prisma.home.findUnique({
    where: { id: homeId },
    include: {
      assignments: {
        include: { homewatcher: true },
        orderBy: { createdAt: "desc" },
      },
      invites: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!home || home.ownerId !== session.user.id) {
    notFound();
  }

  const [reports, messages] = await Promise.all([
    prisma.report.findMany({
      where: { homeId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.message.findMany({
      where: { homeId },
      include: { sender: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const activeWatchers = home.assignments
    .filter((a) => a.status === "accepted")
    .map((a) => ({
      id: a.homewatcherId,
      label: a.homewatcher.name ?? a.homewatcher.email,
    }));

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/dashboard/homeowner" label="Back to your homes" />

      {home.photoUrl ? (
        <Image
          src={home.photoUrl}
          alt={home.nickname}
          width={640}
          height={280}
          className="mt-4 h-56 w-full rounded-3xl object-cover"
        />
      ) : (
        <div className="mt-4 flex h-56 w-full items-center justify-center rounded-3xl bg-accent-soft text-accent">
          <HomeIcon className="h-12 w-12" strokeWidth={1.5} />
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{home.nickname}</h1>
        <Link
          href={`/dashboard/homeowner/homes/${home.id}/edit`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          Edit
        </Link>
      </div>
      <p className="flex items-center gap-1.5 text-ink-muted">
        <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
        {home.address}
      </p>

      {home.notes && (
        <div className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <NotebookPen className="h-4 w-4 text-accent" strokeWidth={2} />
            Notes for your homewatcher
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
            {home.notes}
          </p>
        </div>
      )}

      <div className="mt-8">
        <h2 className="flex items-center gap-1.5 text-lg font-bold text-ink">
          <Users className="h-4 w-4 text-accent" strokeWidth={2} />
          Homewatchers
        </h2>

        {home.assignments.length === 0 && home.invites.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No homewatcher invited yet.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {home.invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{invite.email}</p>
                  <p className="text-xs text-ink-muted">Hasn&apos;t signed up yet</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status="pending" />
                  <form action={cancelInviteAction.bind(null, invite.id)}>
                    <ConfirmButton
                      message={`Cancel the invitation to ${invite.email}?`}
                      ariaLabel="Cancel invitation"
                      className="text-xs font-medium text-ink-muted hover:text-danger"
                    >
                      Cancel
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
            {home.assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {assignment.homewatcher.name ?? assignment.homewatcher.email}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {assignment.homewatcher.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={assignment.status === "accepted" ? "accepted" : "pending"}
                  />
                  <form action={removeAssignmentAction.bind(null, assignment.id)}>
                    <ConfirmButton
                      message={`Remove ${assignment.homewatcher.name ?? assignment.homewatcher.email} from this home?`}
                      ariaLabel="Remove homewatcher"
                      className="text-xs font-medium text-ink-muted hover:text-danger"
                    >
                      Remove
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <InviteForm homeId={home.id} />
      </div>

      <VisitsSection homeId={home.id} />

      <div className="mt-8">
        <h2 className="text-lg font-bold text-ink">Updates</h2>
        <UpdatesFeed
          reports={reports}
          messages={messages}
          currentUserId={session.user.id}
          reportHrefBase={`/dashboard/homeowner/homes/${home.id}/reports`}
        />
        <Link
          href={`/dashboard/homeowner/homes/${home.id}/reports`}
          className="mt-3 inline-block text-sm font-semibold text-accent"
        >
          View all reports
        </Link>
        <MessageComposer homeId={home.id} recipientOptions={activeWatchers} />
      </div>

      <div className="mt-10">
        <DeleteHomeForm homeId={home.id} nickname={home.nickname} />
      </div>
    </div>
  );
}
