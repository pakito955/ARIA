'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit3, Copy, Check, X, FileText } from 'lucide-react'
import { toast } from '@/lib/store'
import { cn } from '@/lib/utils'

const CATEGORIES = ['General', 'Follow-up', 'Meeting', 'Invoice', 'Introduction', 'Thank you', 'Rejection']

interface Template {
  id: string
  name: string
  subject: string
  body: string
  category?: string
  useCount: number
  variables: string
}

export default function TemplatesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (t: Omit<Template, 'id' | 'useCount' | 'variables'>) => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      })
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      setCreating(false)
      toast.success('Template created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Template> & { id: string }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      setEditing(null)
      toast.success('Template updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted')
    },
  })

  const copyTemplate = (t: Template) => {
    navigator.clipboard.writeText(`Subject: ${t.subject}\n\n${t.body}`)
    setCopied(t.id)
    toast.success('Template copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }

  const templates: Template[] = data?.data || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)]">ARIA · Templates</span>
          </div>
          <h1 className="font-outfit text-3xl font-light">Email Templates</h1>
          <p className="text-[11px] text-[var(--text-3)] mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={13} />
          New Template
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl skeleton" />
            ))}
          </div>
        ) : templates.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}
            >
              <FileText size={26} className="text-[var(--accent-text)]" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-white mb-1">No templates yet</p>
              <p className="text-[11px] text-[var(--text-3)]">
                Save your most-used email formats here for instant access
              </p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="mt-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white"
              style={{ background: 'var(--accent)' }}
            >
              Create first template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Create form */}
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="md:col-span-2"
                >
                  <TemplateForm
                    onSave={(t) => createMutation.mutate(t)}
                    onCancel={() => setCreating(false)}
                    loading={createMutation.isPending}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {templates.map((template, i) => (
              <AnimatePresence key={template.id}>
                {editing?.id === template.id ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="md:col-span-2"
                  >
                    <TemplateForm
                      initial={template}
                      onSave={(t) => updateMutation.mutate({ id: template.id, ...t })}
                      onCancel={() => setEditing(null)}
                      loading={updateMutation.isPending}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl p-5 flex flex-col gap-3 group"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{template.name}</p>
                        {template.subject && (
                          <p className="text-[11px] text-[var(--text-3)] truncate mt-0.5">
                            Subject: {template.subject}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => copyTemplate(template)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                          title="Copy"
                        >
                          {copied === template.id
                            ? <Check size={13} className="text-[var(--green)]" />
                            : <Copy size={13} className="text-[var(--text-3)]" />
                          }
                        </button>
                        <button
                          onClick={() => setEditing(template)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={13} className="text-[var(--text-3)]" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(template.id)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} className="text-[var(--red)]" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11.5px] text-[var(--text-2)] leading-relaxed line-clamp-3">
                      {template.body}
                    </p>

                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--border)]">
                      {template.category && (
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                        >
                          {template.category}
                        </span>
                      )}
                      <span className="text-[9px] text-[var(--text-3)] ml-auto">
                        Used {template.useCount}×
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Template
  onSave: (t: { name: string; subject: string; body: string; category?: string }) => void
  onCancel: () => void
  loading?: boolean
}) {
  const [name, setName] = useState(initial?.name || '')
  const [subject, setSubject] = useState(initial?.subject || '')
  const [body, setBody] = useState(initial?.body || '')
  const [category, setCategory] = useState(initial?.category || '')

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', boxShadow: '0 0 0 1px rgba(217,119,87,0.1)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[2px] text-[var(--accent-text)]">
          {initial ? 'Edit template' : 'New template'}
        </p>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
          <X size={14} className="text-[var(--text-3)]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1 block">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="">None</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1 block">Subject line</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Use {{variable}} for placeholders"
          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1 block">
          Body * <span className="normal-case text-[var(--text-3)]">— use {'{{name}}'}, {'{{company}}'} etc.</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Hi {{name}},&#10;&#10;..."
          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[13px] text-white placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-2)] text-[12px] hover:border-[var(--border-medium)] transition-all"
        >
          Cancel
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => name.trim() && body.trim() && onSave({ name, subject, body, category: category || undefined })}
          disabled={!name.trim() || !body.trim() || loading}
          className={cn(
            'px-5 py-2 rounded-xl text-[12px] font-medium text-white disabled:opacity-40 transition-all',
          )}
          style={{ background: 'var(--accent)' }}
        >
          {loading ? 'Saving…' : initial ? 'Save changes' : 'Create template'}
        </motion.button>
      </div>
    </div>
  )
}
