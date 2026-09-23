"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = {
  homeowner: [
    { href: "/dashboard/homeowner", label: "Homes", match: (p: string) => p === "/dashboard/homeowner" || p.startsWith("/dashboard/homeowner/homes") },
    { href: "/dashboard/homeowner/settings", label: "Settings", match: (p: string) => p.startsWith("/dashboard/homeowner/settings") },
  ],
  homewatcher: [
    { href: "/dashboard/homewatcher", label: "Homes", match: (p: string) => p === "/dashboard/homewatcher" || p.startsWith("/dashboard/homewatcher/homes") },
    { href: "/dashboard/homewatcher/clients", label: "Clients", match: (p: string) => p.startsWith("/dashboard/homewatcher/clients") },
    { href: "/dashboard/homewatcher/schedule", label: "Schedule", match: (p: string) => p.startsWith("/dashboard/homewatcher/schedule") },
    { href: "/dashboard/homewatcher/settings", label: "Settings", match: (p: string) => p.startsWith("/dashboard/homewatcher/settings") },
  ],
};

export function DashboardNav({ role }: { role: "homeowner" | "homewatcher" }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 overflow-x-auto bg-surface px-4 pb-3 shadow-sm">
      {LINKS[role].map((l) => (
        <Link
          key={l.href}
          href={l.href}
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
