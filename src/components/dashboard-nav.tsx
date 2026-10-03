"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const hw = "/dashboard/homewatcher";
const link = (href: string, label: string, match: (p: string) => boolean) => ({ href, label, match });
const under = (prefix: string) => (p: string) => p.startsWith(prefix);

const settings = link(`${hw}/settings`, "Settings", under(`${hw}/settings`));
const schedule = link(`${hw}/schedule`, "Schedule", under(`${hw}/schedule`));
const clients = link(`${hw}/clients`, "Clients", under(`${hw}/clients`));
const company = link(`${hw}/company`, "Company", under(`${hw}/company`));
const dashboard = link(hw, "Dashboard", (p) => p === hw || p.startsWith(`${hw}/homes`));
const properties = link(`${hw}/properties`, "Properties", under(`${hw}/properties`));
const inspections = link(`${hw}/inspections`, "Inspections", under(`${hw}/inspections`));

const LINKS = {
  homeowner: [
    link("/dashboard/homeowner", "Homes", (p) => p === "/dashboard/homeowner" || p.startsWith("/dashboard/homeowner/homes")),
    link("/dashboard/homeowner/settings", "Settings", under("/dashboard/homeowner/settings")),
  ],
  // An independent homewatcher, working from homeowners' invitations.
  homewatcher: [{ ...dashboard, label: "Homes" }, clients, company, schedule, settings],
  companyAdmin: [dashboard, properties, inspections, clients, schedule, link(`${hw}/team`, "Team", under(`${hw}/team`)), company, settings],
  companyEmployee: [dashboard, properties, inspections, clients, schedule, company, settings],
};

export type NavVariant = keyof typeof LINKS;

export function DashboardNav({ variant }: { variant: NavVariant }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // On narrow screens the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav ref={navRef} className="flex gap-1.5 overflow-x-auto bg-surface px-4 pb-3 shadow-sm">
      {LINKS[variant].map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.match(pathname) ? "page" : undefined}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            l.match(pathname) ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
