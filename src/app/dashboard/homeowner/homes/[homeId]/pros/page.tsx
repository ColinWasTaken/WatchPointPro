import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TRADES, findTrade } from "@/lib/contractors";
import { ContractorSearch } from "@/components/contractor-search";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function HomeownerProsPage(props: PageProps<"/dashboard/homeowner/homes/[homeId]/pros">) {
  const { homeId } = await props.params;
  const params = await props.searchParams;
  const session = await auth();
  if (!session) redirect("/login");

  const home = await prisma.home.findFirst({ where: { id: homeId, ownerId: session.user.id } });
  if (!home) notFound();
  const issue = one(params.issue) ? await prisma.issue.findFirst({ where: { id: one(params.issue), homeId } }) : null;

  return (
    <ContractorSearch
      userId={session.user.id}
      home={home}
      trade={findTrade(one(params.trade)) ?? TRADES[TRADES.length - 1]}
      back={
        issue
          ? { href: `/dashboard/homeowner/homes/${homeId}/issues/${issue.id}`, label: `Back to ${issue.title}` }
          : { href: `/dashboard/homeowner/homes/${homeId}`, label: `Back to ${home.nickname}` }
      }
      keep={issue ? { issue: issue.id } : {}}
    />
  );
}
