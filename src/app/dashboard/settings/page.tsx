'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Star, Zap, Bell, Eye, Shield, Palette,
  Globe, Mail, CheckCircle, AlertCircle, Loader2,
  Sun, Moon, Monitor, ChevronRight, ToggleLeft, ToggleRight,
  Clock, MessageSquare, FileText, Inbox, PenLine, Plus, Trash2, X, Server,
} from 'lucide-react'
import { VipContactManager } from '@/components/settings/VipContactManager'
import { ExtensionTokenManager } from '@/components/settings/ExtensionTokenManager'
import { ImapConnectModal } from '@/components/settings/ImapConnectModal'
import { useTheme } from '@/lib/theme'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/store'

// ─── Toggle component ───────────────────────────────────────────────────────
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

// ─── Setting row component ───────────────────────────────────────────────────
function SettingRow({
  label, description, children,
}: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
        {description && (
          <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon, title, description, color = 'var(--accent-text)', bg = 'var(--accent-subtle)',
}: { icon: any; title: string; description: string; color?: string; bg?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h2>
        <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{description}</p>
      </div>
    </div>
  )
}

// ─── Select component ────────────────────────────────────────────────────────
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-3 py-1.5 text-[12px] outline-none cursor-pointer"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: 'var(--bg-surface)' }}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Preferences key type ────────────────────────────────────────────────────
const PREF_KEY = 'aria-preferences'

interface Preferences {
  autoAnalyze: boolean
  autoCreateTasks: boolean
  autoFollowUp: boolean
  defaultReplyStyle: string
  urgencyThreshold: string
  briefingTime: string
  briefingFrequency: string
  emailDensity: string
  snoozeDefault: string
  showSentimentBadges: boolean
  criticalNotifications: boolean
  soundEnabled: boolean
  language: string
  followUpDays: string
  // Integrations
  slackWebhookUrl: string
  notionToken: string
  notionDatabaseId: string
  linearApiKey: string
  zapierWebhookUrl: string
  // OOO
  oooEnabled: boolean
  oooMessage: string
  oooStartDate: string
  oooEndDate: string
}

const DEFAULT_PREFS: Preferences = {
  autoAnalyze: true,
  autoCreateTasks: true,
  autoFollowUp: false,
  defaultReplyStyle: 'professional',
  urgencyThreshold: '7',
  briefingTime: '08:00',
  briefingFrequency: 'daily',
  emailDensity: 'comfortable',
  snoozeDefault: '1d',
  showSentimentBadges: true,
  criticalNotifications: true,
  soundEnabled: false,
  language: 'en',
  followUpDays: '2',
  slackWebhookUrl: '',
  notionToken: '',
  notionDatabaseId: '',
  linearApiKey: '',
  zapierWebhookUrl: '',
  oooEnabled: false,
  oooMessage: '',
  oooStartDate: '',
  oooEndDate: '',
}

// ─── Signatures section ──────────────────────────────────────────────────────
function SignaturesSection() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newDefault, setNewDefault] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['signatures'],
    queryFn: async () => {
      const res = await fetch('/api/signatures')
      if (!res.ok) throw new Error('Failed to fetch signatures')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, content: newContent, isDefault: newDefault }),
      })
      if (!res.ok) throw new Error('Failed to create signature')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures'] })
      setShowAdd(false)
      setNewName('')
      setNewContent('')
      setNewDefault(false)
      toast.success('Signature created')
    },
    onError: () => toast.error('Failed to create signature'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await fetch(`/api/signatures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to update signature')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures'] })
      setEditingId(null)
      toast.success('Signature updated')
    },
    onError: () => toast.error('Failed to update signature'),
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/signatures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      if (!res.ok) throw new Error('Failed to set default')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures'] })
      toast.success('Default signature updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/signatures/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete signature')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures'] })
      toast.success('Signature deleted')
    },
    onError: () => toast.error('Failed to delete signature'),
  })

  const signatures = data?.data || []

  return (
    <>
      <SectionHeader
        icon={PenLine}
        title="Email Signatures"
        description="Manage signatures for outgoing emails"
        color="var(--accent-text)"
        bg="var(--accent-subtle)"
      />

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
          </div>
        ) : signatures.length === 0 && !showAdd ? (
          <p className="text-[12px] py-2" style={{ color: 'var(--text-3)' }}>
            No signatures yet. Create one to add it to your emails.
          </p>
        ) : (
          signatures.map((sig: any) => (
            <div
              key={sig.id}
              className="p-3 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>{sig.name}</p>
                  {sig.isDefault && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!sig.isDefault && (
                    <button
                      onClick={() => setDefaultMutation.mutate(sig.id)}
                      className="text-[10px] px-2 py-1 rounded-lg transition-colors hover:text-[var(--text-1)]"
                      style={{ color: 'var(--text-3)' }}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (editingId === sig.id) { setEditingId(null) } else {
                        setEditingId(sig.id)
                        setEditContent(sig.content)
                      }
                    }}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-3)' }}
                  >
                    <PenLine size={12} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(sig.id)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--red)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {editingId === sig.id ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none mb-2"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', color: 'var(--text-1)' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMutation.mutate({ id: sig.id, content: editContent })}
                        disabled={updateMutation.isPending}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white"
                        style={{ background: 'var(--accent)' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-[11px] border"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <pre
                    className="text-[11px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--text-2)', fontFamily: 'inherit' }}
                  >
                    {sig.content.slice(0, 200)}{sig.content.length > 200 && '…'}
                  </pre>
                )}
              </AnimatePresence>
            </div>
          ))
        )}

        {/* Add new signature */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="p-4 rounded-xl space-y-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent)' }}
              >
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Signature name (e.g. Work, Personal)"
                  className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  placeholder="Your signature content…"
                  className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sig-default"
                    checked={newDefault}
                    onChange={(e) => setNewDefault(e.target.checked)}
                    className="rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="sig-default" className="text-[11px]" style={{ color: 'var(--text-2)' }}>
                    Set as default signature
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !newName.trim() || !newContent.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {createMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Create
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setNewName(''); setNewContent('') }}
                    className="px-3 py-1.5 rounded-lg text-[11px] border"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all w-full justify-center"
          style={{
            border: '1px dashed var(--border-medium)',
            color: 'var(--text-3)',
          }}
        >
          <Plus size={11} />
          Add signature
        </button>
      </div>
    </>
  )
}

export default function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)
  const [imapModalOpen, setImapModalOpen] = useState(false)

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREF_KEY)
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) })
    } catch {}
  }, [])

  const setPref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    localStorage.setItem(PREF_KEY, JSON.stringify(next))
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  // Connected integrations
  const { data: integrations, isLoading: intLoading } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/gmail')
      if (!res.ok) return null
      return res.json()
    },
  })

  // IMAP integrations
  const { data: imapIntegrations } = useQuery<Array<{ id: string; email: string; isActive: boolean; imapHost: string | null }>>({
    queryKey: ['imap-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/imap')
      if (!res.ok) return []
      return res.json()
    },
  })

  const disconnectImap = useMutation({
    mutationFn: async (email: string) => {
      await fetch(`/api/integrations/imap/connect?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imap-integrations'] })
    },
  })

  const card = "p-5 rounded-2xl space-y-1"
  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

  return (
    <div className="h-full overflow-y-auto">
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-20"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="empty-state-icon" style={{ width: 40, height: 40 }}>
            <Settings size={16} style={{ color: 'var(--accent-text)' }} />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>Settings</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>Manage your ARIA preferences</p>
          </div>
        </div>
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
            style={{ background: 'var(--green-subtle)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <CheckCircle size={11} />
            Saved
          </motion.div>
        )}
      </div>

      {/* ── 1. Connected Accounts ── */}
      <section className={card} style={cardStyle}>
        <div className="flex items-center justify-between mb-5">
          <SectionHeader
            icon={Globe}
            title="Connected Accounts"
            description="Email providers synced with ARIA"
            color="var(--blue)"
            bg="rgba(59,130,246,0.1)"
          />
          <button
            onClick={() => setImapModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-medium transition-colors shrink-0"
            style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(124,92,255,0.25)', color: 'var(--accent-text)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124,92,255,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent-subtle)')}
          >
            <Plus size={12} /> Add Account
          </button>
        </div>
        <div className="space-y-2">
          {/* Gmail */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(234,67,53,0.1)' }}>
              <Mail size={14} style={{ color: '#ea4335' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>Google Gmail</p>
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                {session?.user?.email || 'Not connected'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="status-live" style={{ width: 6, height: 6 }} />
              <span className="text-[11px]" style={{ color: 'var(--green)' }}>Active</span>
            </div>
          </div>

          {/* Microsoft */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', opacity: 0.6 }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,164,239,0.1)' }}>
              <Mail size={14} style={{ color: '#00a4ef' }} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>Microsoft Outlook</p>
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Not connected</p>
            </div>
            <button
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            >
              Connect
            </button>
          </div>

          {/* IMAP accounts */}
          {imapIntegrations && imapIntegrations.length > 0 && imapIntegrations.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-subtle)' }}>
                <Server size={14} style={{ color: 'var(--accent-text)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>{acc.email}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {acc.imapHost ?? 'IMAP'} · {acc.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <button
                onClick={() => disconnectImap.mutate(acc.email)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                style={{ background: 'var(--red-subtle)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)' }}
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* IMAP Connect Modal */}
      {imapModalOpen && <ImapConnectModal onClose={() => setImapModalOpen(false)} />}

      {/* ── 2. AI Behavior ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Zap}
          title="AI Behavior"
          description="Control how ARIA analyzes and acts on your emails"
        />
        <div>
          <SettingRow label="Auto-analyze new emails" description="ARIA automatically runs analysis when new emails arrive">
            <Toggle enabled={prefs.autoAnalyze} onToggle={() => setPref('autoAnalyze', !prefs.autoAnalyze)} />
          </SettingRow>
          <SettingRow label="Auto-create tasks" description="Extract tasks from emails and add them to your task list automatically">
            <Toggle enabled={prefs.autoCreateTasks} onToggle={() => setPref('autoCreateTasks', !prefs.autoCreateTasks)} />
          </SettingRow>
          <SettingRow label="Show sentiment badges" description="Display Tense / Urgent indicators on email cards">
            <Toggle enabled={prefs.showSentimentBadges} onToggle={() => setPref('showSentimentBadges', !prefs.showSentimentBadges)} />
          </SettingRow>
          <SettingRow label="Default reply style" description="Pre-selected tone when opening the Reply tab">
            <Select
              value={prefs.defaultReplyStyle}
              onChange={(v) => setPref('defaultReplyStyle', v)}
              options={[
                { value: 'short', label: 'Short & Direct' },
                { value: 'professional', label: 'Professional' },
                { value: 'friendly', label: 'Friendly' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Critical urgency threshold" description="Emails with urgency score above this are marked CRITICAL">
            <Select
              value={prefs.urgencyThreshold}
              onChange={(v) => setPref('urgencyThreshold', v)}
              options={[
                { value: '6', label: 'Score ≥ 6' },
                { value: '7', label: 'Score ≥ 7' },
                { value: '8', label: 'Score ≥ 8' },
                { value: '9', label: 'Score ≥ 9' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Auto send follow-ups" description="ARIA automatically sends follow-up emails after your set number of days">
            <Toggle enabled={prefs.autoFollowUp} onToggle={() => setPref('autoFollowUp', !prefs.autoFollowUp)} />
          </SettingRow>
          <SettingRow label="Follow-up after" description="Days without reply before ARIA flags an email as awaiting">
            <Select
              value={prefs.followUpDays}
              onChange={(v) => setPref('followUpDays', v)}
              options={[
                { value: '1', label: '1 day' },
                { value: '2', label: '2 days' },
                { value: '3', label: '3 days' },
                { value: '5', label: '5 days' },
                { value: '7', label: '1 week' },
              ]}
            />
          </SettingRow>
        </div>
      </section>

      {/* ── 3. Briefing & Notifications ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Bell}
          title="Briefing & Notifications"
          description="Schedule your daily AI briefing and alert preferences"
          color="var(--amber)"
          bg="var(--amber-subtle)"
        />
        <div>
          <SettingRow label="Daily briefing time" description="When ARIA generates your morning briefing">
            <input
              type="time"
              value={prefs.briefingTime}
              onChange={(e) => setPref('briefingTime', e.target.value)}
              className="rounded-lg px-3 py-1.5 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
            />
          </SettingRow>
          <SettingRow label="Briefing frequency" description="How often ARIA generates a new briefing">
            <Select
              value={prefs.briefingFrequency}
              onChange={(v) => setPref('briefingFrequency', v)}
              options={[
                { value: 'daily', label: 'Every day' },
                { value: 'weekdays', label: 'Weekdays only' },
                { value: 'manual', label: 'Manual only' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Critical email alerts" description="Browser notifications when a CRITICAL email arrives">
            <Toggle enabled={prefs.criticalNotifications} onToggle={() => setPref('criticalNotifications', !prefs.criticalNotifications)} />
          </SettingRow>
          <SettingRow label="Sound notifications" description="Play a sound for critical alerts">
            <Toggle enabled={prefs.soundEnabled} onToggle={() => setPref('soundEnabled', !prefs.soundEnabled)} />
          </SettingRow>
        </div>
      </section>

      {/* ── 4. Inbox Behaviour ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Inbox}
          title="Inbox Behaviour"
          description="Customize how your inbox displays and handles emails"
          color="var(--green)"
          bg="var(--green-subtle)"
        />
        <div>
          <SettingRow label="Default snooze duration" description="Duration when you snooze an email without picking a time">
            <Select
              value={prefs.snoozeDefault}
              onChange={(v) => setPref('snoozeDefault', v)}
              options={[
                { value: '1h', label: '1 hour' },
                { value: '3h', label: '3 hours' },
                { value: '1d', label: 'Tomorrow' },
                { value: '3d', label: '3 days' },
                { value: '1w', label: '1 week' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Email list density" description="Spacing between email cards in the inbox">
            <Select
              value={prefs.emailDensity}
              onChange={(v) => setPref('emailDensity', v)}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'spacious', label: 'Spacious' },
              ]}
            />
          </SettingRow>
          <SettingRow label="AI response language" description="Language ARIA uses for briefings and reply suggestions">
            <Select
              value={prefs.language}
              onChange={(v) => setPref('language', v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'de', label: 'German' },
                { value: 'fr', label: 'French' },
                { value: 'es', label: 'Spanish' },
                { value: 'bs', label: 'Bosnian' },
              ]}
            />
          </SettingRow>
        </div>
      </section>

      {/* ── 5. Appearance ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Palette}
          title="Appearance"
          description="Customize the look and feel of ARIA"
          color="#f472b6"
          bg="rgba(244,114,182,0.1)"
        />
        <div>
          <SettingRow label="Theme" description="Switch between dark and light mode">
            <div className="flex gap-1.5">
              {[
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'light', icon: Sun, label: 'Light' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => { if (theme !== t.value) toggleTheme() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: theme === t.value ? 'var(--accent)' : 'var(--bg-surface)',
                    border: `1px solid ${theme === t.value ? 'var(--accent)' : 'var(--border)'}`,
                    color: theme === t.value ? 'white' : 'var(--text-2)',
                  }}
                >
                  <t.icon size={11} />
                  {t.label}
                </button>
              ))}
            </div>
          </SettingRow>
        </div>
      </section>

      {/* ── 6. Privacy & Security ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Shield}
          title="Privacy & Security"
          description="Data handling and security preferences"
          color="var(--red)"
          bg="var(--red-subtle)"
        />
        <div>
          <SettingRow label="Email content processing" description="ARIA sends email content to Claude AI for analysis — never stored externally">
            <div className="flex items-center gap-1.5">
              <span className="status-live" style={{ width: 6, height: 6 }} />
              <span className="text-[11px]" style={{ color: 'var(--green)' }}>End-to-end encrypted</span>
            </div>
          </SettingRow>
          <SettingRow label="Tokens stored" description="OAuth access tokens are encrypted at rest using AES-256">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} style={{ color: 'var(--green)' }} />
              <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>AES-256</span>
            </div>
          </SettingRow>
          <SettingRow label="Data retention" description="Email analysis data is stored only in your private database">
            <span className="text-[11px] px-2 py-1 rounded-md" style={{ background: 'var(--bg-surface)', color: 'var(--text-2)' }}>
              Your DB only
            </span>
          </SettingRow>
        </div>
      </section>

      {/* ── 7. Integrations (Slack, Notion, Linear, Zapier) ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Globe}
          title="Integrations"
          description="Connect ARIA to your tools — Slack, Notion, Linear, Zapier"
          color="#10b981"
          bg="rgba(16,185,129,0.1)"
        />
        <div className="space-y-4">
          {/* Slack */}
          <div>
            <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Slack Webhook URL</p>
            <div className="flex gap-2">
              <input
                value={prefs.slackWebhookUrl || ''}
                onChange={(e) => setPref('slackWebhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                className="flex-1 rounded-lg px-3 py-2 text-[12px] outline-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
              />
              <button
                onClick={async () => {
                  const url = prefs.slackWebhookUrl
                  if (!url) return
                  await fetch(url, { method: 'POST', body: JSON.stringify({ text: '✅ ARIA Slack integration test — connected!' }) })
                  alert('Test message sent to Slack!')
                }}
                className="px-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              >
                Test
              </button>
            </div>
            <p className="text-[10.5px] mt-1.5" style={{ color: 'var(--text-3)' }}>ARIA sends your daily briefing to this Slack channel</p>
          </div>

          {/* Notion */}
          <div>
            <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Notion Integration Token</p>
            <input
              value={prefs.notionToken || ''}
              onChange={(e) => setPref('notionToken', e.target.value)}
              placeholder="secret_…"
              type="password"
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
            />
            <p className="text-[11px] font-medium mt-3 mb-1.5" style={{ color: 'var(--text-2)' }}>Notion Database ID</p>
            <input
              value={prefs.notionDatabaseId || ''}
              onChange={(e) => setPref('notionDatabaseId', e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
            />
            <p className="text-[10.5px] mt-1.5" style={{ color: 'var(--text-3)' }}>Detected tasks are automatically created as Notion pages</p>
          </div>

          {/* Linear */}
          <div>
            <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Linear API Key</p>
            <input
              value={prefs.linearApiKey || ''}
              onChange={(e) => setPref('linearApiKey', e.target.value)}
              placeholder="lin_api_…"
              type="password"
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
            />
            <p className="text-[10.5px] mt-1.5" style={{ color: 'var(--text-3)' }}>Critical tasks are synced to Linear automatically</p>
          </div>

          {/* Zapier */}
          <div>
            <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Zapier Webhook URL</p>
            <input
              value={prefs.zapierWebhookUrl || ''}
              onChange={(e) => setPref('zapierWebhookUrl', e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/…"
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
            />
            <p className="text-[10.5px] mt-1.5" style={{ color: 'var(--text-3)' }}>ARIA fires this URL on every critical email — connect any app via Zapier</p>
          </div>
        </div>
      </section>

      {/* ── 8. Vacation / OOO ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Bell}
          title="Vacation Responder"
          description="Auto-reply when you're away from email"
          color="var(--amber)"
          bg="color-mix(in srgb, var(--amber) 12%, transparent)"
        />
        <div>
          <SettingRow label="Enable vacation responder" description="ARIA auto-replies to incoming emails while you're away">
            <Toggle enabled={!!prefs.oooEnabled} onToggle={() => setPref('oooEnabled', !prefs.oooEnabled)} />
          </SettingRow>
          {prefs.oooEnabled && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Out of office message</p>
                <textarea
                  value={prefs.oooMessage || ''}
                  onChange={(e) => setPref('oooMessage', e.target.value)}
                  rows={3}
                  placeholder="Hi, I'm currently away and will be back on [date]. I'll respond to your email as soon as possible."
                  className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>From</p>
                  <input
                    type="date"
                    value={prefs.oooStartDate || ''}
                    onChange={(e) => setPref('oooStartDate', e.target.value)}
                    className="w-full rounded-lg px-2 py-1.5 text-[11px] outline-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
                  />
                </div>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>Until</p>
                  <input
                    type="date"
                    value={prefs.oooEndDate || ''}
                    onChange={(e) => setPref('oooEndDate', e.target.value)}
                    className="w-full rounded-lg px-2 py-1.5 text-[11px] outline-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 9. Email Signatures ── */}
      <section className={card} style={cardStyle}>
        <SignaturesSection />
      </section>

      {/* ── 10. Chrome Extension Tokens ── */}
      <section className={card} style={cardStyle}>
        <ExtensionTokenManager />
      </section>

      {/* ── 11. VIP Contacts ── */}
      <section className={card} style={cardStyle}>
        <VipContactManager />
      </section>

      {/* ── 12. Account info ── */}
      <section className={card} style={cardStyle}>
        <SectionHeader
          icon={Eye}
          title="Account"
          description="Your ARIA account details"
          color="var(--text-2)"
          bg="var(--bg-hover)"
        />
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--amber))' }}
            >
              {session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                {session?.user?.name || 'User'}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                {session?.user?.email || ''}
              </p>
            </div>
            <span
              className="text-[10px] px-2 py-1 rounded-full font-medium"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
            >
              Pro
            </span>
          </div>

          <p className="text-[10.5px] text-center pt-2" style={{ color: 'var(--text-3)' }}>
            ARIA v2.0 · Powered by Claude AI · All preferences saved locally
          </p>
        </div>
      </section>
    </motion.div>
    </div>
  )
}
