import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./settings-forms";

export async function SettingsPage({ role }: { role: "homeowner" | "homewatcher" }) {
  const session = await auth();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-ink">Settings</h1>
      <section className="mt-6 rounded-3xl bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-ink">Profile</h2>
        <ProfileForm name={user.name ?? ""} email={user.email} notifyEmail={user.notifyEmail} />
      </section>
      <section className="mt-6 rounded-3xl bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-ink">Password</h2>
        <PasswordForm />
      </section>
      <div className="mt-6">
        <DeleteAccountForm isOwner={role === "homeowner"} />
      </div>
    </div>
  );
}
