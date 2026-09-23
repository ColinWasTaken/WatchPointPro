import { CheckCircle2, Clock } from "lucide-react";

export function StatusBadge({ status }: { status: "accepted" | "pending" }) {
  if (status === "accepted") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
        Active
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-pending-soft px-2.5 py-1 text-xs font-semibold text-pending">
      <Clock className="h-3.5 w-3.5" strokeWidth={2} />
      Pending
    </span>
  );
}
