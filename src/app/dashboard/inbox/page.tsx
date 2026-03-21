'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { EmailCard } from '@/components/inbox/EmailCard'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

const FILTERS = ['all', 'unread', 'critical', 'meeting', 'task', 'starred'] as const

export default function InboxPage() {
  const { emailFilter, setEmailFilter, searchQuery, setSearchQuery } = useAppStore()
  const [sort, setSort] = useState<'newest' | 'priority'>('newest')
  const qc = useQueryClient()

  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['emails', emailFilter, debouncedSearch, sort],
    queryFn: async () => {
      const params = new URLSearchParams({
        filter: emailFilter,
        sort,
        limit: '50',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      const res = await fetch(`/api/emails?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emails'] })
    },
  })

  const emails = data?.data || []
  const total = data?.total || 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.055]">
        <div>
          <h1 className="font-cormorant text-3xl font-light">Inbox</h1>
          <p className="text-[11px] text-[#8888aa] mt-0.5">
            AI-sortiran · {total} poruka
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-[#5a5a78] hover:text-[#8888aa] transition-colors"
          title="Osvježi"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-white/[0.055] space-y-2">
        {/* Search */}
        <div className="flex items-center gap-2 bg-[#0d0d1a] border border-white/[0.07] rounded px-3 py-2">
          <Search size={13} className="text-[#5a5a78] shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretraži emailove…"
            className="flex-1 bg-transparent text-[12px] text-white placeholder:text-[#5a5a78] outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#5a5a78] text-xs">✕</button>
          )}
        </div>

        {/* Filters + Sort */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setEmailFilter(f)}
              className={cn(
                'px-3 py-1 rounded text-[11px] whitespace-nowrap transition-all',
                emailFilter === f
                  ? 'bg-[#e8c97a]/[0.08] text-[#e8c97a]'
                  : 'text-[#8888aa] hover:text-white'
              )}
            >
              {f === 'all' ? 'Sve'
                : f === 'unread' ? 'Nepročitano'
                : f === 'critical' ? '🔴 Kritično'
                : f === 'meeting' ? '📅 Sastanci'
                : f === 'task' ? '✓ Zadaci'
                : '⭐ Starred'}
            </button>
          ))}

          <button
            onClick={() => setSort(sort === 'newest' ? 'priority' : 'newest')}
            className="ml-auto flex items-center gap-1.5 text-[10px] text-[#5a5a78] hover:text-[#8888aa] transition-colors"
          >
            <SlidersHorizontal size={11} />
            {sort === 'newest' ? 'Novo' : 'Prioritet'}
          </button>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <EmailListSkeleton />
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <span className="text-4xl opacity-10">✉</span>
            <p className="text-[#5a5a78] text-sm">
              {searchQuery ? 'Nema rezultata pretrage' : 'Inbox je prazan'}
            </p>
          </div>
        ) : (
          <div>
            {emails.map((email: any, i: number) => (
              <EmailCard
                key={email.id}
                email={email}
                index={i}
                onAnalyze={(id) => analyzeMutation.mutate(id)}
                analyzing={analyzeMutation.isPending && analyzeMutation.variables === email.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmailListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-[72px] rounded skeleton" />
      ))}
    </div>
  )
}
