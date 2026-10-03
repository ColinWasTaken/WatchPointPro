import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { getCompanyContext } from "@/lib/authz";

export default async function HomewatcherLayout({
  children,
}: LayoutProps<"/dashboard/homewatcher">) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "homewatcher") {
    redirect("/dashboard");
  }

  const ctx = await getCompanyContext(session.user.id);
  const nav = !ctx ? "homewatcher" : ctx.role === "admin" ? "companyAdmin" : "companyEmployee";

  const unread = await prisma.notification.count({ where: { userId: session.user.id, readAt: null } });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader homeHref="/dashboard/homewatcher" userEmail={session.user.email ?? ""} nav={nav} unread={unread} />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
