import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/authz";
import { InviteMemberForm, SendInvitationButton } from "@/components/company-forms";
import { ConfirmButton } from "@/components/confirm-button";
import { LocalTime } from "@/components/local-time";
import {
  cancelTeamInvitationAction,
  inviteTeamMemberAction,
  removeMemberAction,
  resendTeamInvitationAction,
  setMemberRoleAction,
} from "@/lib/actions/team";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", employee: "Team member" };
const outlineButton =
  "rounded-full border border-border px-3.5 py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent";
const dangerButton =
  "rounded-full border border-border px-3.5 py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:border-danger hover:text-danger";

export default async function TeamPage() {
  const ctx = await requireCompanyAdmin();
  const [members, invitations, assigned] = await Promise.all([
    prisma.companyMember.findMany({
      where: { companyId: ctx.company.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { companyId: ctx.company.id, kind: "employee", acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.home.groupBy({
      by: ["assignedEmployeeId"],
      where: { companyId: ctx.company.id, assignedEmployeeId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const assignedCount = new Map(assigned.map((g) => [g.assignedEmployeeId, g._count._all]));
  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[30px] leading-tight sm:text-[34px] text-ink">Team</h1>
      <p className="text-sm text-ink-muted">
        {members.length} {members.length === 1 ? "person" : "people"} at {ctx.company.name}
      </p>

      <div className="mt-6">
        <InviteMemberForm action={inviteTeamMemberAction} />
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {members.map((m) => {
          const name = m.user.name ?? m.user.email;
          const count = assignedCount.get(m.userId) ?? 0;
          const isSelf = m.userId === ctx.userId;
          return (
            <li key={m.id} className="rounded-3xl bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {name}
                    {isSelf && <span className="ml-1.5 text-xs font-normal text-ink-muted">(you)</span>}
                  </p>
                  <p className="break-all text-sm text-ink-muted">{m.user.email}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {count} {count === 1 ? "property" : "properties"} assigned
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    m.role === "admin" ? "bg-accent text-white" : "bg-accent-soft text-accent"
                  }`}
                >
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              </div>
              {!isSelf && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={setMemberRoleAction.bind(null, m.id, m.role === "admin" ? "employee" : "admin")}>
                    {m.role === "admin" ? (
                      <button type="submit" className={outlineButton}>
                        Make team member
                      </button>
                    ) : (
                      <ConfirmButton
                        message={`Make ${name} an admin? Admins can manage clients, properties, and the team.`}
                        className={outlineButton}
                      >
                        Make admin
                      </ConfirmButton>
                    )}
                  </form>
                  <form action={removeMemberAction.bind(null, m.id)}>
                    <ConfirmButton
                      message={`Remove ${name} from ${ctx.company.name}? Their properties will become unassigned.`}
                      className={dangerButton}
                    >
                      Remove
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {invitations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink">Pending invitations</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {invitations.map((inv) => {
              const expired = inv.expiresAt < now;
              return (
                <li key={inv.id} className="rounded-3xl bg-surface p-4 shadow-sm">
                  <p className="break-all font-semibold text-ink">{inv.email}</p>
                  <p className="text-xs text-ink-muted">
                    {ROLE_LABEL[inv.role ?? "employee"]} ·{" "}
                    {expired ? (
                      <>
                        expired <LocalTime iso={inv.expiresAt.toISOString()} style="date" />
                      </>
                    ) : (
                      <>
                        sent <LocalTime iso={inv.createdAt.toISOString()} style="date" />, expires{" "}
                        <LocalTime iso={inv.expiresAt.toISOString()} style="date" />
                      </>
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <SendInvitationButton
                      action={resendTeamInvitationAction.bind(null, inv.id)}
                      label={expired ? "Send again" : "Resend"}
                    />
                    <form action={cancelTeamInvitationAction.bind(null, inv.id)}>
                      <ConfirmButton message="Cancel this invitation? The link in the email will stop working." className={dangerButton}>
                        Cancel
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
