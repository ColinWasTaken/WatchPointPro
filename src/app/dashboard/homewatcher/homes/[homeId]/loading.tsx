import { Skeleton } from "@/components/skeleton";

export default function HomewatcherHomeDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-56 w-full rounded-3xl" />
      <Skeleton className="mt-4 h-7 w-1/2" />
      <Skeleton className="mt-2 h-4 w-2/3" />

      <div className="mt-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-3 h-40 w-full rounded-3xl" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-3 h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
