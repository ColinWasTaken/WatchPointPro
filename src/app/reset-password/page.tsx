import Link from "next/link";
import { peekToken } from "@/lib/tokens";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const { token } = await props.searchParams;
  const value = Array.isArray(token) ? token[0] : token;
  const valid = value ? Boolean(await peekToken(value, "reset_password")) : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-md">
        <h1 className="mb-6 text-xl font-bold text-ink">Choose a new password</h1>
        {valid && value ? (
          <ResetPasswordForm token={value} />
        ) : (
          <>
            <p className="text-sm text-ink-muted">This reset link is invalid or has expired.</p>
            <Link href="/forgot-password" className="mt-4 block text-center text-sm font-semibold text-accent">
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
