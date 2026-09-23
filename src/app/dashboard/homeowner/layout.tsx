import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader homeHref="/dashboard/homeowner" userEmail={session.user.email ?? ""} role="homeowner" />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
