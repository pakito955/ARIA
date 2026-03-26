import {
  QueryClient,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { useCallback } from 'react'
import type { UnifiedEmail } from '@/types'

// ── Production QueryClient config ────────────────────────────────────────────

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s — SSE keeps data fresh in between
      gcTime: 5 * 60_000,          // 5min garbage-collection window
      retry: 2,
      refetchOnWindowFocus: false, // SSE handles real-time updates
      refetchOnReconnect: true,
    },
  },
} as const

export const createQueryClient = () => new QueryClient(queryClientConfig)

// ── Email filter shape ────────────────────────────────────────────────────────

export interface EmailFilters {
  filter?: string
  search?: string
  focusMode?: boolean
  limit?: number
}

// ── Canonical query key factory ───────────────────────────────────────────────

export const emailKeys = {
  all: ['emails'] as const,
  list: (filters: EmailFilters) => ['emails', 'list', filters] as const,
  detail: (id: string) => ['emails', 'detail', id] as const,
  stats: ['stats'] as const,
}

// ── Email page shape ──────────────────────────────────────────────────────────

interface EmailPage {
  data: UnifiedEmail[]
  hasMore: boolean
  nextPageToken?: string
  total: number
}

// ── useEmails — infinite query with SSE-aware optimistic actions ──────────────

export function useEmails(filters: EmailFilters) {
  const qc = useQueryClient()

  const query = useInfiniteQuery<
    EmailPage,
    Error,
    InfiniteData<EmailPage>,
    ReturnType<typeof emailKeys.list>,
    string | undefined
  >({
    queryKey: emailKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (filters.filter && filters.filter !== 'all') params.set('filter', filters.filter)
      if (filters.search) params.set('search', filters.search)
      if (filters.focusMode) params.set('focusMode', 'true')
      if (filters.limit) params.set('limit', String(filters.limit))
      if (pageParam) params.set('pageToken', pageParam)

      const res = await fetch(`/api/emails?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to fetch emails: ${res.status}`)
      return res.json() as Promise<EmailPage>
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPageToken : undefined),
    staleTime: 30_000,
  })

  const emails = query.data?.pages.flatMap((p) => p.data) ?? []
  const hasMore = query.data?.pages.at(-1)?.hasMore ?? false

  const loadMore = useCallback(() => {
    if (!query.isFetchingNextPage && hasMore) query.fetchNextPage()
  }, [query, hasMore])

  // Optimistic archive
  const archiveEmail = useCallback(
    async (id: string) => {
      const key = emailKeys.list(filters)
      const previous = qc.getQueryData<InfiniteData<EmailPage>>(key)

      qc.setQueryData<InfiniteData<EmailPage>>(key, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((em) => em.id !== id),
          })),
        }
      })

      try {
        const res = await fetch(`/api/emails/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive' }),
        })
        if (!res.ok) throw new Error('Archive failed')
        qc.invalidateQueries({ queryKey: emailKeys.stats })
      } catch {
        qc.setQueryData(key, previous)
      }
    },
    [qc, filters]
  )

  // Optimistic delete
  const deleteEmail = useCallback(
    async (id: string) => {
      const key = emailKeys.list(filters)
      const previous = qc.getQueryData<InfiniteData<EmailPage>>(key)

      qc.setQueryData<InfiniteData<EmailPage>>(key, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((em) => em.id !== id),
          })),
        }
      })

      try {
        const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        qc.invalidateQueries({ queryKey: emailKeys.stats })
      } catch {
        qc.setQueryData(key, previous)
      }
    },
    [qc, filters]
  )

  return {
    emails,
    isLoading: query.isLoading,
    isSyncing: query.isFetching && !query.isLoading,
    hasMore,
    loadMore,
    archiveEmail,
    deleteEmail,
    error: query.error,
  }
}
