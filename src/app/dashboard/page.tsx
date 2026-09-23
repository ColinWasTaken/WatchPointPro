import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardIndexPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "homeowner") {
    redirect("/dashboard/homeowner");
  }

  if (session.user.role === "homewatcher") {
    redirect("/dashboard/homewatcher");
  }

  redirect("/login");
}
