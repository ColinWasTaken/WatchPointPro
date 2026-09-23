import { Skeleton } from "@/components/skeleton";

export default function HomeDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-56 w-full rounded-3xl" />
      <Skeleton className="mt-4 h-7 w-1/2" />
      <Skeleton className="mt-2 h-4 w-2/3" />

      <div className="mt-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-16 w-full rounded-2xl" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-3 h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
