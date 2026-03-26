'use client'

import { useRef, useCallback, useEffect, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { EmailCard } from './EmailCard'

// Note: requires @tanstack/react-virtual
// Install: npm install @tanstack/react-virtual

interface Email {
  id: string
  subject: string
  fromEmail: string
  fromName?: string
  bodyText: string
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  receivedAt: string
  analysis?: {
    priority: string
    category: string
    summary?: string
    urgencyScore: number
    confidenceScore: number
    sentiment?: string
  }
}

interface Props {
  emails: Email[]
  onSelect: (id: string) => void
  selectedId?: string
  onAnalyze: (id: string) => void
  analyzingId?: string
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isFetchingMore?: boolean
}

export const VirtualEmailList = memo(function VirtualEmailList({
  emails,
  onSelect,
  selectedId,
  onAnalyze,
  analyzingId,
  selectedIds,
  onToggleSelect,
  onLoadMore,
  hasMore,
  isFetchingMore,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
    getItemKey: (index) => emails[index].id,
  })

  // Keyboard navigation — up/down arrows
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedId) return
      const idx = emails.findIndex((em) => em.id === selectedId)
      if (idx === -1) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = emails[idx + 1]
        if (next) {
          onSelect(next.id)
          virtualizer.scrollToIndex(idx + 1, { align: 'auto', behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = emails[idx - 1]
        if (prev) {
          onSelect(prev.id)
          virtualizer.scrollToIndex(idx - 1, { align: 'auto', behavior: 'smooth' })
        }
      }
    },
    [emails, selectedId, onSelect, virtualizer]
  )

  // Scroll selected item into view when selection changes externally
  useEffect(() => {
    if (!selectedId) return
    const idx = emails.findIndex((em) => em.id === selectedId)
    if (idx !== -1) virtualizer.scrollToIndex(idx, { align: 'auto', behavior: 'smooth' })
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection observer for infinite scroll trigger
  useEffect(() => {
    if (!onLoadMore || !hasMore || !loadMoreRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) onLoadMore()
      },
      { threshold: 0.1 }
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore, isFetchingMore])

  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto h-full outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Email list"
      role="listbox"
    >
      {/* Height spacer — makes scrollbar sized correctly */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map((virtualRow) => {
          const email = emails[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              role="option"
              aria-selected={email.id === selectedId}
            >
              <EmailCard
                email={email as any}
                onAnalyze={onAnalyze}
                analyzing={analyzingId === email.id}
                selected={selectedIds?.has(email.id) ?? false}
                onToggleSelect={onToggleSelect}
              />
            </div>
          )
        })}
      </div>

      {/* Load-more sentinel */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingMore ? (
            <span className="text-[12px] animate-pulse" style={{ color: 'var(--text-3)' }}>
              Loading more…
            </span>
          ) : (
            <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
              Scroll for more
            </span>
          )}
        </div>
      )}
    </div>
  )
})
