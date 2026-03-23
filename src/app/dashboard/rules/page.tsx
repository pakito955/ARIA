'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, ArrowRight, Sparkles, ChevronDown, TrendingUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/store'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Rule {
  id: string
  name: string
  enabled: boolean
  triggerField: string
  triggerOperator: string
  triggerValue: string
  action: string
  actionValue?: string
  triggerCount: number
  lastTriggeredAt?: string
  aiGenerated: boolean
  createdAt: string
}

interface RuleSuggestion {
  name: string
  triggerField: string
  triggerOperator: string
  triggerValue: string
  action: string
  actionValue?: string
  reasoning: string
  estimatedImpact: string
}

const FIELDS = [
  { value: 'from',          label: 'From' },
  { value: 'subject',       label: 'Subject' },
  { value: 'body',          label: 'Body' },
  { value: 'category',      label: 'Category' },
  { value: 'priority',      label: 'Priority' },
  { value: 'sentiment',     label: 'Sentiment' },
  { value: 'hasAttachment', label: 'Has Attachment' },
]

const OPERATORS = [
  { value: 'contains',   label: 'contains' },
  { value: 'equals',     label: 'equals' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith',   label: 'ends with' },
  { value: 'is',         label: 'is' },
]

const ACTIONS = [
  { value: 'archive',        label: 'Archive' },
  { value: 'markRead',       label: 'Mark as read' },
  { value: 'createTask',     label: 'Create task' },
  { value: 'snooze',         label: 'Snooze' },
  { value: 'label',          label: 'Add label' },
  { value: 'forward',        label: 'Forward to' },
  { value: 'notifyWebhook',  label: 'Send webhook' },
  { value: 'autoReply',      label: 'Auto-reply with' },
  { value: 'setVip',         label: 'Mark as VIP' },
]

const ACTION_VALUE_NEEDED = ['label', 'snooze', 'forward', 'notifyWebhook', 'autoReply']

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
      style={{ background: enabled ? 'var(--accent)' : 'var(--bg-hover)', border: '1px solid var(--border-medium)' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: enabled ? 'translateX(17px)' : 'translateX(1px)', marginTop: '1px' }}
      />
    </button>
  )
}

function SelectField({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-2.5 py-1.5 text-[12px] outline-none cursor-pointer"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: 'var(--bg-surface)' }}>{o.label}</option>
      ))}
    </select>
  )
}

interface NewRuleForm {
  name: string
  triggerField: string
  triggerOperator: string
  triggerValue: string
  action: string
  actionValue: string
}

const DEFAULT_FORM: NewRuleForm = {
  name: '',
  triggerField: 'from',
  triggerOperator: 'contains',
  triggerValue: '',
  action: 'archive',
  actionValue: '',
}

export default function RulesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [form, setForm] = useState<NewRuleForm>(DEFAULT_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const res = await fetch('/api/rules')
      if (!res.ok) throw new Error('Failed to fetch rules')
      return res.json()
    },
  })

  const { data: suggestData, isLoading: suggestLoading } = useQuery({
    queryKey: ['rule-suggestions'],
    queryFn: async () => {
      const res = await fetch('/api/ai/suggest-rules')
      if (!res.ok) return { data: [] }
      return res.json()
    },
    enabled: showSuggestions,
    staleTime: 5 * 60_000,
  })

  const createMutation = useMutation({
    mutationFn: async (rule: NewRuleForm & { aiGenerated?: boolean }) => {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      })
      if (!res.ok) throw new Error('Failed to create rule')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] })
      setShowAdd(false)
      setForm(DEFAULT_FORM)
      toast.success('Rule created', 'Automation')
    },
    onError: () => toast.error('Failed to create rule'),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle rule')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete rule')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] })
      toast.success('Rule deleted')
    },
    onError: () => toast.error('Failed to delete rule'),
  })

  const handleCreate = () => {
    if (!form.name.trim() || !form.triggerValue.trim()) {
      toast.warning('Name and trigger value are required')
      return
    }
    createMutation.mutate(form)
  }

  const acceptSuggestion = (s: RuleSuggestion) => {
    createMutation.mutate({
      name: s.name,
      triggerField: s.triggerField,
      triggerOperator: s.triggerOperator,
      triggerValue: s.triggerValue,
      action: s.action,
      actionValue: s.actionValue || '',
      aiGenerated: true,
    })
  }

  const rules: Rule[] = data?.data || []
  const suggestions: RuleSuggestion[] = suggestData?.data || []
  const existingRuleNames = new Set(rules.map(r => r.name.toLowerCase()))

  const getActionLabel = (action: string) => ACTIONS.find((a) => a.value === action)?.label || action
  const getFieldLabel = (field: string) => FIELDS.find((f) => f.value === field)?.label || field
  const getOperatorLabel = (op: string) => OPERATORS.find((o) => o.value === op)?.label || op

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="h-full overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-20">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
              <Zap size={16} style={{ color: 'var(--accent-text)' }} />
            </div>
            <div>
              <h1 className="font-outfit text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                Automation Rules
              </h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                Auto-pilot for your inbox
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            >
              <Sparkles size={12} style={{ color: 'var(--accent-text)' }} />
              AI Suggest
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-all"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(124,92,255,0.3)' }}
            >
              <Plus size={13} />
              Add Rule
            </button>
          </div>
        </div>

        {/* AI Suggestions panel */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={13} style={{ color: 'var(--accent-text)' }} />
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--accent-text)' }}>
                    AI-Suggested Rules · Based on your email patterns
                  </p>
                </div>

                {suggestLoading ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>Analyzing patterns…</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-[12px] text-center py-4" style={{ color: 'var(--text-3)' }}>Not enough data yet for suggestions</p>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((s, i) => {
                      const alreadyExists = existingRuleNames.has(s.name.toLowerCase())
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 p-3 rounded-xl"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-1)' }}>{s.name}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{s.reasoning}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}>
                                {getFieldLabel(s.triggerField)} {getOperatorLabel(s.triggerOperator)} "{s.triggerValue}"
                              </span>
                              <ArrowRight size={8} style={{ color: 'var(--text-3)' }} />
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}>
                                {getActionLabel(s.action)}
                              </span>
                              {s.estimatedImpact && (
                                <span className="text-[9px]" style={{ color: 'var(--green)' }}>
                                  <TrendingUp size={8} className="inline mr-0.5" />
                                  {s.estimatedImpact}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => acceptSuggestion(s)}
                            disabled={alreadyExists || createMutation.isPending}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all disabled:opacity-40"
                            style={{ background: alreadyExists ? 'var(--bg-hover)' : 'var(--accent)' }}
                          >
                            {alreadyExists ? 'Added' : <><Plus size={10} /> Add</>}
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add rule form */}
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
                <p className="text-[11px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--accent-text)' }}>New Rule</p>

                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] mb-1.5 block" style={{ color: 'var(--text-3)' }}>Rule Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Archive newsletters, Flag urgent clients…"
                    className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--text-3)' }}>If</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <SelectField value={form.triggerField} onChange={(v) => setForm({ ...form, triggerField: v })} options={FIELDS} />
                    <SelectField value={form.triggerOperator} onChange={(v) => setForm({ ...form, triggerOperator: v })} options={OPERATORS} />
                    <input
                      value={form.triggerValue}
                      onChange={(e) => setForm({ ...form, triggerValue: e.target.value })}
                      placeholder="value…"
                      className="flex-1 min-w-[120px] rounded-lg px-3 py-1.5 text-[12px] outline-none"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--text-3)' }}>Then</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <SelectField value={form.action} onChange={(v) => setForm({ ...form, action: v })} options={ACTIONS} />
                    {ACTION_VALUE_NEEDED.includes(form.action) && (
                      <input
                        value={form.actionValue}
                        onChange={(e) => setForm({ ...form, actionValue: e.target.value })}
                        placeholder={
                          form.action === 'label' ? 'label name…'
                          : form.action === 'snooze' ? 'hours…'
                          : form.action === 'forward' ? 'email address…'
                          : form.action === 'notifyWebhook' ? 'webhook URL…'
                          : 'reply text…'
                        }
                        className="flex-1 min-w-[140px] rounded-lg px-3 py-1.5 text-[12px] outline-none"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Create Rule
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM) }}
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

        {/* Rules list */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <Zap size={20} style={{ color: 'var(--border-medium)' }} />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>No rules yet</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                  Create your first rule or try AI suggestions
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSuggestions(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                >
                  <Sparkles size={12} style={{ color: 'var(--accent-text)' }} />
                  AI Suggestions
                </button>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  <Plus size={12} />
                  Add first rule
                </button>
              </div>
            </div>
          ) : (
            <div>
              {rules.map((rule, i) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn('flex items-center gap-4 px-5 py-4 transition-colors', !rule.enabled && 'opacity-50')}
                  style={{ borderBottom: i < rules.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <Toggle enabled={rule.enabled} onToggle={() => toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>{rule.name}</p>
                      {rule.aiGenerated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                          AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-2)' }}>
                        {getFieldLabel(rule.triggerField)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{getOperatorLabel(rule.triggerOperator)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                        "{rule.triggerValue}"
                      </span>
                      <ArrowRight size={9} style={{ color: 'var(--text-3)' }} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-2)' }}>
                        {getActionLabel(rule.action)}{rule.actionValue && `: ${rule.actionValue}`}
                      </span>
                      {rule.triggerCount > 0 && (
                        <span className="text-[9px]" style={{ color: 'var(--green)' }}>
                          ↑ triggered {rule.triggerCount}×{rule.lastTriggeredAt && ` · ${formatDistanceToNow(new Date(rule.lastTriggeredAt), { addSuffix: true })}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                    style={{ color: 'var(--red)' }}
                    title="Delete rule"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {rules.length > 0 && (
          <div className="text-center space-y-1">
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              {rules.filter(r => r.enabled).length} active rule{rules.filter(r => r.enabled).length !== 1 ? 's' : ''} ·{' '}
              {rules.reduce((sum, r) => sum + (r.triggerCount || 0), 0)} total triggers
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
