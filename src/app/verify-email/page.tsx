import Link from "next/link";
import { peekToken } from "@/lib/tokens";
import { verifyEmailAction } from "@/lib/actions/account";

export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const { token } = await props.searchParams;
  const value = Array.isArray(token) ? token[0] : token;
  const valid = value && value !== "invalid" ? Boolean(await peekToken(value, "verify_email")) : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 text-center shadow-md">
        <h1 className="mb-2 text-xl font-bold text-ink">Confirm your email</h1>
        {valid && value ? (
          <>
            <p className="mb-6 text-sm text-ink-muted">One tap and your account is ready.</p>
            <form action={verifyEmailAction.bind(null, value)}>
              <button className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong">
                Confirm my email
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-muted">This confirmation link is invalid or has expired. If you already confirmed your email, you can just sign in.</p>
            <Link href="/login" className="text-sm font-semibold text-accent">
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
