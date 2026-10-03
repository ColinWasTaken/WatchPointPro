import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PropertyThread } from "@/components/property-thread";
import { clientName } from "@/lib/fields";
import { threadAccess } from "@/lib/property-thread";

export default async function PropertyMessagesPage(props: PageProps<"/dashboard/homewatcher/properties/[homeId]/messages">) {
  const { homeId } = await props.params;
  const access = await threadAccess(homeId);
  if (!access || access.side !== "company") notFound();
  const { home } = access;
  const owner = home.client ? clientName(home.client) : (home.owner?.name ?? "the homeowner");

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homewatcher/properties/${homeId}`} label={`Back to ${home.nickname}`} />
      <h1 className="mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">Messages</h1>
      <p className="mt-1 text-sm text-ink-muted">
        With {owner} about {home.nickname}. Admins and the team member assigned to the property see this conversation.
      </p>
      {!home.ownerId && (
        <p className="mt-4 rounded-2xl bg-pending-soft px-4 py-3 text-sm text-pending">
          {owner} doesn’t have a WatchPointPro account yet, so they won’t see messages until they join.{" "}
          {home.client && (
            <Link href={`/dashboard/homewatcher/clients/${home.client.id}`} className="font-semibold underline">
              Invite them from their client page
            </Link>
          )}
        </p>
      )}
      <PropertyThread access={access} />
    </div>
  );
}
