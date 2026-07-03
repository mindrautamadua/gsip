// Reusable skeleton primitives (Tailwind animate-pulse, theme-aware).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--surface-2)] ${className}`} />;
}

function HeaderSkeleton() {
  return (
    <header className="px-6 md:px-10 pt-10 md:pt-14 pb-8">
      <Skeleton className="h-5 w-44 rounded-full mb-5" />
      <Skeleton className="h-11 md:h-14 w-2/3 max-w-xl" />
      <Skeleton className="h-4 w-full max-w-2xl mt-5" />
      <Skeleton className="h-4 w-3/4 max-w-lg mt-2.5" />
    </header>
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

// Generic list/dashboard page skeleton: header + stat row + card grid.
export function PageSkeleton({ stats = 4, cards = 6 }: { stats?: number; cards?: number }) {
  return (
    <div>
      <HeaderSkeleton />
      <div className="px-6 md:px-10 pb-24 space-y-6">
        {stats > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: stats }).map((_, i) => (
              <div key={i} className="card p-5 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Detail page skeleton: back link + title + stacked section cards.
export function DetailSkeleton() {
  return (
    <div>
      <header className="px-6 md:px-10 pt-10 md:pt-14 pb-8">
        <Skeleton className="h-4 w-28 mb-6" />
        <div className="flex gap-2 mb-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-10 md:h-12 w-3/4 max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-2xl mt-5" />
      </header>
      <div className="px-6 md:px-10 pb-24 space-y-6 max-w-5xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6 space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
