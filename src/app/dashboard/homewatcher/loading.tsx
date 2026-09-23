import { Skeleton } from "@/components/skeleton";

export default function HomewatcherDashboardLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl bg-surface p-4 shadow-sm">
            <Skeleton className="mb-3 h-32 w-full rounded-2xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-3 h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
