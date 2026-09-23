"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { UserRole } from "@/types/next-auth";

const ROLE_LABEL: Record<UserRole, string> = {
  homeowner: "Homeowner",
  homewatcher: "Homewatcher",
};

export function AuthForm({
  initialRole,
  notice,
}: {
  initialRole: UserRole | null;
  notice: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(
    initialRole ? "signup" : "signin",
  );
  const [role, setRole] = useState<UserRole>(initialRole ?? "homeowner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [resent, setResent] = useState(false);

  async function resendVerification() {
    await fetch("/api/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResent(false);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, role }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          setSubmitting(false);
          return;
        }
        if (data.needsVerification) {
          setAwaitingVerification(true);
          setSubmitting(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.code === "email_not_verified") {
        setAwaitingVerification(true);
        setSubmitting(false);
        return;
      }

      if (result?.error) {
        setError("Invalid email or password.");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (awaitingVerification) {
    return (
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 text-center shadow-md">
        <h1 className="mb-2 text-xl font-bold text-ink">Check your email</h1>
        <p className="mb-6 text-sm text-ink-muted">
          We sent a confirmation link to <span className="font-semibold text-ink">{email}</span>.
          Tap it to finish setting up your account, then sign in.
        </p>
        <button
          type="button"
          onClick={resendVerification}
          disabled={resent}
          className="text-sm font-semibold text-accent disabled:text-ink-muted"
        >
          {resent ? "Sent — check your inbox" : "Resend the email"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAwaitingVerification(false);
            setMode("signin");
          }}
          className="mt-4 block w-full text-sm font-medium text-ink-muted hover:text-accent"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-md">
      <div className="mb-6 flex rounded-full bg-accent-soft p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
            mode === "signin"
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-muted"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
            mode === "signup"
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-muted"
          }`}
        >
          Sign Up
        </button>
      </div>

      {notice && (
        <p className="mb-4 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm text-accent">{notice}</p>
      )}

      <h1 className="mb-6 text-xl font-bold text-ink">
        {mode === "signup"
          ? `Create your ${ROLE_LABEL[role]} account`
          : "Welcome back"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <div className="flex rounded-full bg-accent-soft p-1 text-sm">
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-full py-1.5 font-semibold transition-colors ${
                  role === r ? "bg-accent text-white" : "text-ink-muted"
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        )}

        {mode === "signup" && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />

        {mode === "signin" && (
          <Link href="/forgot-password" className="-mt-1 self-end text-xs font-medium text-ink-muted hover:text-accent">
            Forgot password?
          </Link>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {submitting
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}
