'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { VoiceBriefing } from '@/components/VoiceBriefing'

export function AiBriefingWidget() {
  const { data: briefingData, refetch } = useQuery({
    queryKey: ['briefing', 'today'],
    queryFn: async () => {
      const res = await fetch('/api/ai/briefing')
      return res.json()
    },
    staleTime: 60_000 * 5,
  })

  const briefingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/briefing', { method: 'POST' })
      return res.json()
    },
    onSuccess: () => refetch(),
  })

  return (
    <div className="card-premium p-5 relative overflow-hidden h-full">
      {/* Ambient gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(124,58,237,0.07) 0%, transparent 55%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(124,58,237,0.14)',
            border: '1px solid rgba(124,58,237,0.26)',
            boxShadow: '0 0 8px rgba(124,58,237,0.18)',
          }}
        >
          {briefingMutation.isPending
            ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent-purple, #7c3aed)' }} />
            : <Sparkles size={12} style={{ color: 'var(--accent-purple, #7c3aed)' }} />
          }
        </div>
        <span
          className="text-[9px] tracking-[2.5px] uppercase font-semibold"
          style={{ color: 'var(--accent-purple, #7c3aed)' }}
        >
          AI Briefing
        </span>
        {briefingMutation.isPending && (
          <div className="flex gap-1 ml-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full typing-dot"
                style={{ background: 'var(--accent-purple, #7c3aed)' }}
              />
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {briefingData?.data?.content && <VoiceBriefing text={briefingData.data.content} />}
          <button
            onClick={() => briefingMutation.mutate()}
            disabled={briefingMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-full disabled:opacity-40 transition-all duration-150"
            style={{
              background: 'rgba(124,58,237,0.10)',
              border: '1px solid rgba(124,58,237,0.24)',
              color: 'var(--text-2)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(124,58,237,0.18)'
              el.style.borderColor = 'rgba(124,58,237,0.42)'
              el.style.color = 'var(--text-1)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(124,58,237,0.10)'
              el.style.borderColor = 'rgba(124,58,237,0.24)'
              el.style.color = 'var(--text-2)'
            }}
          >
            <RefreshCw size={10} style={{ color: 'var(--accent-purple, #7c3aed)' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Briefing content */}
      <div
        className="text-[12.5px] leading-[1.85] max-h-[120px] overflow-hidden relative z-10"
        style={{ color: 'var(--text-1)' }}
        dangerouslySetInnerHTML={{
          __html: briefingData?.data?.content ||
            '<span style="color:var(--text-3)">Click <b style="color:var(--accent-purple,#7c3aed)">Refresh</b> to generate your morning analysis. ARIA will summarize all critical emails, pending tasks, and suggest actions for the day.</span>',
        }}
      />
    </div>
  )
}
