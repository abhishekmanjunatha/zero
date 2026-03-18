export default function LabReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1.5">
          <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Report card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="h-11 w-11 rounded-lg bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="h-7 w-7 rounded bg-muted animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
