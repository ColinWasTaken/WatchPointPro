import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-md">
        <h1 className="mb-2 text-xl font-bold text-ink">Forgot your password?</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Enter your email and we&apos;ll send you a link to choose a new one.
        </p>
        <ForgotPasswordForm />
        <Link href="/login" className="mt-6 block text-center text-sm font-medium text-ink-muted hover:text-accent">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
