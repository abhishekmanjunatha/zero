export default function PatientsLoading() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="h-6 w-24 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-32 rounded-md bg-muted animate-pulse mt-1.5" />
      </div>

      {/* Search + add bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="h-9 w-full max-w-md rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border overflow-hidden bg-card">
        <div className="h-10 bg-muted/40 border-b" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3.5 w-28 rounded bg-muted animate-pulse hidden md:block" />
            <div className="h-5 w-20 rounded-full bg-muted animate-pulse hidden md:block" />
            <div className="h-3.5 w-20 rounded bg-muted animate-pulse hidden md:block" />
            <div className="h-7 w-16 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
