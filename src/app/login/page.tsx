import { AuthForm } from "./auth-form";
import type { UserRole } from "@/types/next-auth";

function parseRole(value: string | string[] | undefined): UserRole | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "homeowner" || raw === "homewatcher" ? raw : null;
}

// Where to go after signing in. Only same-site paths (no scheme, "//", backslash, or whitespace),
// so a crafted link can't send someone to another site.
function parseNext(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^\/(?![/\\])[^\s\\]*$/.test(raw) ? raw : null;
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const role = parseRole(searchParams.role);
  const next = parseNext(searchParams.next);
  const notice = searchParams.verified
    ? "Email confirmed. You can sign in now."
    : searchParams.reset
      ? "Password updated. Sign in with your new password."
      : next?.startsWith("/invite")
        ? "Sign in to accept your invitation."
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <AuthForm initialRole={role} notice={notice} next={next} />
    </div>
  );
}
