import { AuthForm } from "./auth-form";
import type { UserRole } from "@/types/next-auth";

function parseRole(value: string | string[] | undefined): UserRole | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "homeowner" || raw === "homewatcher" ? raw : null;
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const role = parseRole(searchParams.role);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <AuthForm initialRole={role} />
    </div>
  );
}
