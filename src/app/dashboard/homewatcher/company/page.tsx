import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ListChecks } from "lucide-react";
import { auth } from "@/auth";
import { getCompanyContext } from "@/lib/authz";
import { companyChecklist } from "@/lib/checklist";
import { createCompanyAction, updateCompanyAction } from "@/lib/actions/company";
import { CompanyForm } from "@/components/company-forms";

export default async function CompanyPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const ctx = await getCompanyContext(session.user.id);

  if (!ctx) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Building2 className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-[30px] leading-tight sm:text-[34px] text-ink">Set up your company</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your company holds your clients and the properties you watch. Working solo? Create a company for yourself and add
          team members later.
        </p>
        <div className="mt-6">
          <CompanyForm action={createCompanyAction} submitLabel="Create company" />
        </div>
      </div>
    );
  }

  const { company, role } = ctx;
  const checklist = await companyChecklist(company.id);
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-[30px] leading-tight sm:text-[34px] text-ink">{company.name}</h1>
      <p className="text-sm text-ink-muted">
        {role === "admin" ? "You're an admin of this company." : "You're a team member. Only admins can edit company details."}
      </p>
      <div className="mt-6">
        {role === "admin" ? (
          <CompanyForm action={updateCompanyAction} submitLabel="Save changes" company={company} />
        ) : (
          <dl className="flex flex-col gap-3 rounded-3xl bg-surface p-6 text-sm shadow-sm">
            {[
              ["Phone", company.phone],
              ["Email", company.email],
              ["Website", company.website],
              ["Service area", company.serviceArea],
              ["Address", company.address],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold text-ink">{k}</dt>
                <dd className="text-ink-muted">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <Link
        href="/dashboard/homewatcher/company/checklist"
        className="mt-6 flex items-center gap-4 rounded-3xl bg-surface p-6 shadow-sm transition hover:shadow-md"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ListChecks className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink">Home check checklist</span>
          <span className="block text-sm text-ink-muted">
            {checklist.custom ? "Your own" : "The standard"} list of {checklist.items.length} items.{" "}
            {role === "admin" ? "Add, rename, or reorder items." : "See what every check covers."}
          </span>
        </span>
      </Link>
    </div>
  );
}
