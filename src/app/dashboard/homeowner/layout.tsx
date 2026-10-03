import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function HomeownerLayout({
  children,
}: LayoutProps<"/dashboard/homeowner">) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "homeowner") {
    redirect("/dashboard");
  }

  const unread = await prisma.notification.count({ where: { userId: session.user.id, readAt: null } });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader homeHref="/dashboard/homeowner" userEmail={session.user.email ?? ""} nav="homeowner" unread={unread} />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
