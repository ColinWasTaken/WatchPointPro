import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-accent"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label}
    </Link>
  );
}
