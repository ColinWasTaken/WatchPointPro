import { Skeleton } from "@/components/skeleton";

export default function SubmitReportLoading() {
  return (
    <div className="mx-auto max-w-lg">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-7 w-40" />
      <div className="mt-6 flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-sm">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-11 w-full rounded-full" />
    </div>
  );
}
