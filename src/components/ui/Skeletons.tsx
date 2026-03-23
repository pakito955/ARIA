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

export function BriefingSkeleton() {
  return (
    <div className="p-6 space-y-5">
      {/* AI Summary card */}
      <div className="rounded-2xl p-6 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="h-2 w-20 skeleton rounded-full" />
        <div className="space-y-2">
          <div className="h-3 skeleton rounded-full w-full" />
          <div className="h-3 skeleton rounded-full w-5/6" />
          <div className="h-3 skeleton rounded-full w-4/6" />
        </div>
      </div>
      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 rounded-xl text-center space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-4 h-4 skeleton rounded-full mx-auto" />
            <div className="h-8 w-8 skeleton rounded-lg mx-auto" />
            <div className="h-2 w-14 skeleton rounded-full mx-auto" />
          </div>
        ))}
      </div>
      {/* Meeting cards */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 1 - i * 0.2 }}>
          <div className="w-14 space-y-1.5 shrink-0">
            <div className="h-4 skeleton rounded" />
            <div className="h-2 skeleton rounded w-8 mx-auto" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3.5 skeleton rounded-full w-3/4" />
            <div className="h-2.5 skeleton rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function QueueSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl p-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-2 w-24 skeleton rounded-full" />
            <div className="h-5 w-48 skeleton rounded-lg" />
            <div className="h-2.5 w-32 skeleton rounded-full" />
          </div>
          <div className="h-2.5 w-12 skeleton rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-3 skeleton rounded-full w-full" />
          <div className="h-3 skeleton rounded-full w-5/6" />
          <div className="h-3 skeleton rounded-full w-4/6" />
          <div className="h-3 skeleton rounded-full w-3/4" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <div className="h-10 w-24 skeleton rounded-xl" />
          <div className="h-10 w-24 skeleton rounded-xl" />
        </div>
      </div>
    </div>
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
