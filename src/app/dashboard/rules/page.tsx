'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, ChevronRight, Loader2, ArrowRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Rule {
  id: string
  name: string
  enabled: boolean
  triggerField: string
  triggerOperator: string
  triggerValue: string
  action: string
  actionValue?: string
  createdAt: string
}

const FIELDS = [
  { value: 'from',     label: 'From' },
  { value: 'subject',  label: 'Subject' },
  { value: 'body',     label: 'Body' },
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
]

const OPERATORS = [
  { value: 'contains',    label: 'contains' },
  { value: 'equals',      label: 'equals' },
  { value: 'startsWith',  label: 'starts with' },
  { value: 'endsWith',    label: 'ends with' },
]

const ACTIONS = [
  { value: 'archive',    label: 'Archive' },
  { value: 'markRead',   label: 'Mark as read' },
  { value: 'createTask', label: 'Create task' },
  { value: 'snooze',     label: 'Snooze' },
  { value: 'label',      label: 'Add label' },
]

const ACTION_VALUE_NEEDED = ['label', 'snooze']

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

function Select({ value, onChange, options }: {
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
  const [form, setForm] = useState<NewRuleForm>(DEFAULT_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const res = await fetch('/api/rules')
      if (!res.ok) throw new Error('Failed to fetch rules')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (rule: Omit<NewRuleForm, 'name'> & { name: string }) => {
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
      toast.success('Rule created', 'Rules')
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

  const rules: Rule[] = data?.data || []

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
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)' }}
            >
              <Zap size={16} style={{ color: 'var(--accent-text)' }} />
            </div>
            <div>
              <h1 className="font-outfit text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                Email Rules
              </h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                Automate actions on incoming emails
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-all"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(217,119,87,0.3)' }}
          >
            <Plus size={13} />
            Add Rule
          </button>
        </div>

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
                style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', boxShadow: '0 0 0 1px rgba(217,119,87,0.1)' }}
              >
                <p className="text-[11px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--accent-text)' }}>
                  New Rule
                </p>

                {/* Name */}
                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                    Rule Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Archive newsletters"
                    className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-1)',
                    }}
                  />
                </div>

                {/* IF condition */}
                <div>
                  <p className="text-[10px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--text-3)' }}>
                    If
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={form.triggerField}
                      onChange={(v) => setForm({ ...form, triggerField: v })}
                      options={FIELDS}
                    />
                    <Select
                      value={form.triggerOperator}
                      onChange={(v) => setForm({ ...form, triggerOperator: v })}
                      options={OPERATORS}
                    />
                    <input
                      value={form.triggerValue}
                      onChange={(e) => setForm({ ...form, triggerValue: e.target.value })}
                      placeholder="value…"
                      className="flex-1 min-w-[120px] rounded-lg px-3 py-1.5 text-[12px] outline-none"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-1)',
                      }}
                    />
                  </div>
                </div>

                {/* THEN action */}
                <div>
                  <p className="text-[10px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--text-3)' }}>
                    Then
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={form.action}
                      onChange={(v) => setForm({ ...form, action: v })}
                      options={ACTIONS}
                    />
                    {ACTION_VALUE_NEEDED.includes(form.action) && (
                      <input
                        value={form.actionValue}
                        onChange={(e) => setForm({ ...form, actionValue: e.target.value })}
                        placeholder={form.action === 'label' ? 'label name…' : 'hours…'}
                        className="flex-1 min-w-[120px] rounded-lg px-3 py-1.5 text-[12px] outline-none"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-1)',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-all disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {createMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={12} />
                    )}
                    Create Rule
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM) }}
                    className="px-4 py-2 rounded-xl text-[12px] border transition-all"
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
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <Zap size={20} style={{ color: 'var(--border-medium)' }} />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>No rules yet</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                  Create your first rule to automate email actions
                </p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium text-white mt-1"
                style={{ background: 'var(--accent)' }}
              >
                <Plus size={12} />
                Add first rule
              </button>
            </div>
          ) : (
            <div>
              {rules.map((rule, i) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 transition-colors',
                    !rule.enabled && 'opacity-50'
                  )}
                  style={{
                    borderBottom: i < rules.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Toggle */}
                  <Toggle
                    enabled={rule.enabled}
                    onToggle={() => toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
                  />

                  {/* Rule description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                      {rule.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-2)' }}
                      >
                        {getFieldLabel(rule.triggerField)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {getOperatorLabel(rule.triggerOperator)}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                      >
                        "{rule.triggerValue}"
                      </span>
                      <ArrowRight size={9} style={{ color: 'var(--text-3)' }} />
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-2)' }}
                      >
                        {getActionLabel(rule.action)}
                        {rule.actionValue && `: ${rule.actionValue}`}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--red)_10%,transparent)]"
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
          <p className="text-[11px] text-center" style={{ color: 'var(--text-3)' }}>
            Rules are applied in order. Drag to reorder (coming soon).
          </p>
        )}
      </div>
    </motion.div>
  )
}
