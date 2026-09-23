import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard-header";

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader homeHref="/dashboard/homewatcher" userEmail={session.user.email ?? ""} />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
