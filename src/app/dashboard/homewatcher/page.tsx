import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyContext } from "@/lib/authz";
import { CompanyDashboard } from "./company-dashboard";
import { LegacyHomes } from "./legacy-homes";

export default async function HomewatcherDashboardPage(props: PageProps<"/dashboard/homewatcher">) {
  const session = await auth();
  if (!session) redirect("/login");
  const { joined } = await props.searchParams;
  const ctx = await getCompanyContext(session.user.id);

  if (ctx) {
    return (
      <div className="mx-auto max-w-3xl">
        <CompanyDashboard ctx={ctx} joined={joined === "1"} />
        <LegacyHomes userId={session.user.id} embedded />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-start gap-3 rounded-3xl bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Run a home-watch business?</h2>
        <p className="text-sm text-ink-muted">
          Set up your company to manage clients, properties, scheduled checks, and your team.
        </p>
        <Link
          href="/dashboard/homewatcher/company"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          Set up your company
        </Link>
      </div>
      <LegacyHomes userId={session.user.id} />
    </div>
  );
}
