import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findOpenInvitation } from "@/lib/invitations";
import { clientName } from "@/lib/fields";
import { acceptInvitationAction, signUpFromInvitationAction } from "@/lib/actions/invitations";
import { AcceptInvitationButton, InvitationSignUpForm, SwitchAccountButton } from "./invite-forms";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false, follow: false } };

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl bg-surface p-8 shadow-md">{children}</div>
        <p className="mt-4 text-center text-xs text-ink-muted">Powered by WatchPointPro</p>
      </div>
    </div>
  );
}

export default async function InvitePage(props: PageProps<"/invite">) {
  const { token } = await props.searchParams;
  const value = (Array.isArray(token) ? token[0] : token) ?? "";
  const [invitation, session] = await Promise.all([findOpenInvitation(value), auth()]);

  if (!invitation) {
    return (
      <Card>
        <h1 className="mb-2 text-xl font-bold text-ink">Invitation not available</h1>
        <p className="mb-4 text-sm text-ink-muted">
          This invitation link is invalid or has expired. Ask your home-watch company to send a new one. If you already
          accepted it, just sign in.
        </p>
        <Link href={session ? "/dashboard" : "/login"} className="text-sm font-semibold text-accent">
          {session ? "Go to your dashboard" : "Go to sign in"}
        </Link>
      </Card>
    );
  }

  const { company, client } = invitation;
  const account = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, role: true },
  });
  const invitePath = `/invite?token=${encodeURIComponent(value)}`;

  let body: ReactNode;
  if (session && account && session.user.id === account.id) {
    body =
      account.role === "homeowner" ? (
        <AcceptInvitationButton action={acceptInvitationAction.bind(null, value)} />
      ) : (
        <p className="text-sm text-danger">
          {invitation.email} is a homewatcher account, so it can&apos;t be connected as a homeowner. Ask {company.name} to
          invite a different email address.
        </p>
      );
  } else if (session) {
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          This invitation is for <span className="font-semibold text-ink">{invitation.email}</span>, but you&apos;re
          signed in as <span className="font-semibold text-ink">{session.user.email}</span>.
        </p>
        <SwitchAccountButton callbackUrl={invitePath} />
      </div>
    );
  } else if (account) {
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          You already have a WatchPointPro account for <span className="font-semibold text-ink">{invitation.email}</span>.
          Sign in to accept.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(invitePath)}`}
          className="w-full rounded-full bg-accent py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Sign in to accept
        </Link>
      </div>
    );
  } else {
    body = (
      <InvitationSignUpForm
        action={signUpFromInvitationAction.bind(null, value)}
        email={invitation.email}
        defaultName={clientName(client)}
      />
    );
  }

  return (
    <Card>
      <div className="mb-6 flex flex-col items-center text-center">
        {company.logoUrl ? (
          <Image
            src={company.logoUrl}
            alt={`${company.name} logo`}
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Building2 className="h-7 w-7" strokeWidth={1.75} />
          </div>
        )}
        <h1 className="mt-3 text-xl font-bold text-ink">Hi {client.firstName}, you&apos;re invited</h1>
        <p className="mt-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">{company.name}</span> uses WatchPointPro to provide digital home-check
          reports. Create your account to view inspections, photos, videos, and property updates.
        </p>
      </div>
      {body}
    </Card>
  );
}
