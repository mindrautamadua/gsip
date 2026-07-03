import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <header className="px-6 md:px-10 pt-10 md:pt-14 pb-8">
        <Skeleton className="h-5 w-56 rounded-full mb-5" />
        <Skeleton className="h-11 md:h-14 w-2/3 max-w-xl" />
        <Skeleton className="h-4 w-full max-w-2xl mt-5" />
      </header>
      <div className="px-6 md:px-10 pb-24 space-y-8 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <Skeleton className="h-3 w-40 mb-3" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
