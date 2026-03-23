export function EmailCardSkeleton({ count = 7 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 px-3 py-3 mb-0.5 rounded-xl"
          style={{ opacity: 1 - i * 0.1 }}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full skeleton shrink-0 mt-0.5" />
          {/* Content */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div className="h-2.5 rounded-full skeleton" style={{ width: `${40 + (i % 3) * 20}px` }} />
              <div className="h-2 rounded-full skeleton w-8 shrink-0" />
            </div>
            <div className="h-2.5 rounded-full skeleton" style={{ width: '85%' }} />
            <div className="h-2.5 rounded-full skeleton" style={{ width: `${60 + (i % 4) * 8}%` }} />
          </div>
        </div>
      ))}
    </>
  )
}

export function StatCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="w-8 h-8 rounded-xl skeleton mb-3" />
          <div className="h-7 w-14 skeleton rounded-lg mb-2" />
          <div className="h-2.5 w-20 skeleton rounded-full" />
        </div>
      ))}
    </>
  )
}

export function TaskItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2.5 rounded"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="w-3.5 h-3.5 rounded skeleton shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 skeleton rounded-full" style={{ width: `${55 + i * 10}%` }} />
            <div className="h-2 skeleton rounded-full w-16" />
          </div>
          <div className="w-1.5 h-1.5 rounded-full skeleton shrink-0" />
        </div>
      ))}
    </>
  )
}

export function ReportSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCardSkeleton count={6} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="h-2.5 w-28 skeleton rounded-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-2.5 skeleton rounded-full" style={{ width: `${100 + i * 20}px` }} />
                <div className="h-2.5 skeleton rounded-full w-6" />
              </div>
              <div className="h-1.5 w-full skeleton rounded-full" />
            </div>
          ))}
        </div>
        <div
          className="rounded-2xl p-5 space-y-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="h-2.5 w-24 skeleton rounded-full mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full skeleton shrink-0" />
              <div className="h-2.5 flex-1 skeleton rounded-full" style={{ width: `${70 + i * 5}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
