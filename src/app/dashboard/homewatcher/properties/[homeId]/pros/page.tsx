import { prisma } from "@/lib/prisma";
import { getPropertyOr404, requireCompany } from "@/lib/authz";
import { TRADES, findTrade } from "@/lib/contractors";
import { ContractorSearch } from "@/components/contractor-search";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CompanyProsPage(props: PageProps<"/dashboard/homewatcher/properties/[homeId]/pros">) {
  const { homeId } = await props.params;
  const params = await props.searchParams;
  const ctx = await requireCompany();
  const home = await getPropertyOr404(ctx, homeId);
  const issue = one(params.issue) ? await prisma.issue.findFirst({ where: { id: one(params.issue), homeId } }) : null;

  return (
    <ContractorSearch
      userId={ctx.userId}
      home={home}
      trade={findTrade(one(params.trade)) ?? TRADES[TRADES.length - 1]}
      back={
        issue
          ? { href: `/dashboard/homewatcher/issues/${issue.id}`, label: `Back to ${issue.title}` }
          : { href: `/dashboard/homewatcher/properties/${homeId}`, label: `Back to ${home.nickname}` }
      }
      keep={issue ? { issue: issue.id } : {}}
    />
  );
}
