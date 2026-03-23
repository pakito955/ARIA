'use client'

import { useState, startTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, Search, Tag, Loader2, Sparkles, X, Edit2, Check } from 'lucide-react'
import { toast } from '@/lib/store'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface KnowledgeItem {
  id: string
  title: string
  content: string
  source: string
  tags: string
  useCount: number
  createdAt: string
  updatedAt: string
}

const SUGGESTED_TAGS = ['pricing', 'company', 'product', 'policy', 'team', 'process', 'client', 'legal']

function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
      style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}
    >
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-60 transition-opacity">
          <X size={9} />
        </button>
      )}
    </span>
  )
}

export default function KnowledgePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', tags: [] as string[], tagInput: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge', search],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge${search ? `?q=${encodeURIComponent(search)}` : ''}`)
      return res.json()
    },
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, content: form.content, tags: form.tags }),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge'] })
      setShowAdd(false)
      setForm({ title: '', content: '', tags: [], tagInput: '' })
      toast.success('Knowledge item added', 'Knowledge Base')
    },
    onError: () => toast.error('Failed to save knowledge item'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge'] })
      toast.success('Item deleted')
    },
  })

  const items: KnowledgeItem[] = data?.data || []

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: '' }))
    } else {
      setForm(f => ({ ...f, tagInput: '' }))
    }
  }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.warning('Title and content are required')
      return
    }
    createMutation.mutate()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="h-full overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
              <BookOpen size={16} style={{ color: 'var(--accent-text)' }} />
            </div>
            <div>
              <h1 className="font-outfit text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                Knowledge Base
              </h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                ARIA uses this context to write smarter replies
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-all"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(124,92,255,0.3)' }}
          >
            <Plus size={13} />
            Add Knowledge
          </button>
        </div>

        {/* How it works banner */}
        <div
          className="p-4 rounded-xl flex items-start gap-3"
          style={{ background: 'var(--accent-subtle)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}
        >
          <Sparkles size={14} style={{ color: 'var(--accent-text)', marginTop: 2, flexShrink: 0 }} />
          <div>
            <p className="text-[12px] font-medium" style={{ color: 'var(--accent-text)' }}>How it works</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
              Add your company info, pricing, policies, or any context. When you compose replies, ARIA automatically detects and injects relevant knowledge — so your emails are always accurate and consistent.
            </p>
          </div>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="p-5 rounded-2xl space-y-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', boxShadow: '0 0 0 1px rgba(124,92,255,0.1)' }}
              >
                <p className="text-[11px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--accent-text)' }}>
                  New Knowledge Item
                </p>

                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] mb-1.5 block" style={{ color: 'var(--text-3)' }}>Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Current Pricing, Refund Policy, Team Members…"
                    className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] mb-1.5 block" style={{ color: 'var(--text-3)' }}>Content</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Paste your content here — pricing tables, policies, FAQs, company info…"
                    rows={6}
                    className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none resize-none font-mono"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] mb-1.5 block" style={{ color: 'var(--text-3)' }}>Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.tags.map(tag => (
                      <TagBadge key={tag} tag={tag} onRemove={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      value={form.tagInput}
                      onChange={(e) => setForm(f => ({ ...f, tagInput: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(form.tagInput) }
                      }}
                      placeholder="Add tag…"
                      className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SUGGESTED_TAGS.filter(t => !form.tags.includes(t)).map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        className="text-[10px] px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save Item
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setForm({ title: '', content: '', tags: [], tagInput: '' }) }}
                    className="px-4 py-2 rounded-xl text-[12px] border"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
          <input
            value={search}
            onChange={(e) => startTransition(() => setSearch(e.target.value))}
            placeholder="Search knowledge base…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
          />
        </div>

        {/* Items list */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 110 }} />
            ))
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <BookOpen size={20} style={{ color: 'var(--border-medium)' }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                {search ? 'No results found' : 'No knowledge items yet'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                {search ? 'Try a different search term' : 'Add context that ARIA can use in your replies'}
              </p>
            </div>
          ) : (
            items.map((item, i) => {
              const tags = (() => { try { return JSON.parse(item.tags || '[]') } catch { return [] } })()
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-5 rounded-2xl group"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{item.title}</p>
                        {item.useCount > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
                            Used {item.useCount}×
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] line-clamp-2 mb-2.5" style={{ color: 'var(--text-2)' }}>
                        {item.content}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {tags.map((tag: string) => (
                          <TagBadge key={tag} tag={tag} />
                        ))}
                        <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                          Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all shrink-0"
                      style={{ color: 'var(--red)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>

        {items.length > 0 && (
          <p className="text-[11px] text-center" style={{ color: 'var(--text-3)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} in your knowledge base · ARIA retrieves relevant items automatically
          </p>
        )}
      </div>
    </motion.div>
  )
}
