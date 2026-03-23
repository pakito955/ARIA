'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { TrendingUp, Loader2, Zap } from 'lucide-react'
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
    <div className="card-premium shimmer-highlight p-5 relative overflow-hidden h-full">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.04) 0%, transparent 50%)' }}
      />

      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={13} className="text-[var(--accent-text)]" />
        <span className="text-[9px] tracking-[2px] uppercase text-[var(--accent-text)]">AI Briefing</span>
        {briefingMutation.isPending && (
          <div className="flex gap-1 ml-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
            ))}
          </div>
        )}
        {briefingData?.data?.content && (
          <div className="ml-auto">
            <VoiceBriefing text={briefingData.data.content} />
          </div>
        )}
        <button
          onClick={() => briefingMutation.mutate()}
          disabled={briefingMutation.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-2)] text-[10px] hover:border-[var(--accent)] hover:text-white transition-all disabled:opacity-50 ml-auto"
        >
          {briefingMutation.isPending
            ? <Loader2 size={10} className="animate-spin text-[var(--accent-text)]" />
            : <Zap size={10} className="text-[var(--accent-text)]" />
          }
          Refresh
        </button>
      </div>

      <div
        className="text-[12.5px] leading-[1.85] text-[var(--text-1)] max-h-[120px] overflow-hidden"
        dangerouslySetInnerHTML={{
          __html: briefingData?.data?.content ||
            '<span style="color:var(--text-3)">Click <b style="color:var(--accent-text)">Refresh</b> to generate your morning analysis. ARIA will summarize all critical emails, pending tasks, and suggest actions for the day.</span>',
        }}
      />
    </div>
  )
}
