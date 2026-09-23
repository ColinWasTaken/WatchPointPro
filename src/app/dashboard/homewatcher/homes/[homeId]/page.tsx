import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Home as HomeIcon,
  MapPin,
  Mail,
  NotebookPen,
  ClipboardCheck,
  ClipboardList,
  MessageCircle,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReportList } from "@/components/report-list";
import { MessageList } from "@/components/message-list";
import { MessageComposer } from "@/components/message-composer";
import { VisitsSection } from "@/components/visits-section";
import { BackLink } from "@/components/back-link";
import { ConfirmButton } from "@/components/confirm-button";
import { leaveHomeAction } from "@/lib/actions/assignments";
import { WatcherNotesForm } from "./watcher-notes-form";
import { ChecklistEditor } from "./checklist-editor";

export default async function HomewatcherHomeDetailPage(
  props: PageProps<"/dashboard/homewatcher/homes/[homeId]">,
) {
  const { homeId } = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const assignment = await prisma.homeAssignment.findUnique({
    where: { homeId_homewatcherId: { homeId, homewatcherId: session.user.id } },
    include: { home: { include: { owner: true } } },
  });

  if (!assignment || assignment.status !== "accepted") {
    notFound();
  }

  const [checklistItems, reports, messages] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { homeId },
      orderBy: { order: "asc" },
    }),
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

  const { home } = assignment;

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/dashboard/homewatcher" label="Back to your homes" />

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

      <h1 className="mt-4 text-2xl font-bold text-ink">{home.nickname}</h1>
      <p className="flex items-center gap-1.5 text-ink-muted">
        <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
        {home.address}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
        <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {home.owner.name ?? home.owner.email}
      </p>

      {home.notes && (
        <div className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <NotebookPen className="h-4 w-4 text-accent" strokeWidth={2} />
            Notes from the homeowner
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
            {home.notes}
          </p>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Your notes</h2>
        <WatcherNotesForm homeId={homeId} initialNotes={assignment.watcherNotes ?? ""} />
      </div>

      <VisitsSection homeId={homeId} />

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-lg font-bold text-ink">
            <ClipboardList className="h-4 w-4 text-accent" strokeWidth={2} />
            Checklist
          </h2>
          <Link
            href={`/dashboard/homewatcher/homes/${homeId}/report`}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong"
          >
            <ClipboardCheck className="h-4 w-4" strokeWidth={2} />
            Submit Report
          </Link>
        </div>
        <ChecklistEditor homeId={homeId} items={checklistItems} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-ink">Recent reports</h2>
        <ReportList reports={reports} hrefBase={`/dashboard/homewatcher/homes/${homeId}/reports`} />
        <Link
          href={`/dashboard/homewatcher/homes/${homeId}/reports`}
          className="mt-3 inline-block text-sm font-semibold text-accent"
        >
          View all reports
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="flex items-center gap-1.5 text-lg font-bold text-ink">
          <MessageCircle className="h-4 w-4 text-accent" strokeWidth={2} />
          Messages
        </h2>
        <MessageList messages={messages} currentUserId={session.user.id} />
        <MessageComposer homeId={homeId} />
      </div>

      <form action={leaveHomeAction.bind(null, homeId)} className="mt-10">
        <ConfirmButton
          message={`Stop watching ${home.nickname}? You'll lose access to it.`}
          className="text-sm font-medium text-ink-muted hover:text-danger"
        >
          Stop watching this home
        </ConfirmButton>
      </form>
    </div>
  );
}
