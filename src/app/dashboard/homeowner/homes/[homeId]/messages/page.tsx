import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PropertyThread } from "@/components/property-thread";
import { threadAccess } from "@/lib/property-thread";

export default async function HomeMessagesPage(props: PageProps<"/dashboard/homeowner/homes/[homeId]/messages">) {
  const { homeId } = await props.params;
  const access = await threadAccess(homeId);
  if (!access || access.side !== "owner") notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/dashboard/homeowner/homes/${homeId}`} label={`Back to ${access.home.nickname}`} />
      <h1 className="mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">Messages</h1>
      <p className="mt-1 text-sm text-ink-muted">
        With {access.company.name} about {access.home.nickname}. Everyone on their team who looks after the house can read and
        reply.
      </p>
      <PropertyThread access={access} />
    </div>
  );
}
