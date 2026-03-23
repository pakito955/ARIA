'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Chrome, Copy, Trash2, Plus, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from '@/lib/store'

interface TokenRecord {
  id: string
  label: string
  lastUsedAt: string | null
  createdAt: string
  token?: string // only present right after creation
}

function formatDate(d: string | null) {
  if (!d) return 'Never'
  const date = new Date(d)
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ExtensionTokenManager() {
  const qc = useQueryClient()
  const [newToken, setNewToken] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [labelInput, setLabelInput] = useState('Chrome Extension')

  const { data, isLoading } = useQuery<{ tokens: TokenRecord[] }>({
    queryKey: ['extension-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/extension/token')
      if (!res.ok) throw new Error('Failed to load tokens')
      return res.json()
    },
  })

  const createMut = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch('/api/extension/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate token')
      }
      return res.json()
    },
    onSuccess: (data) => {
      setNewToken(data.token.token)
      setVisible(true)
      qc.invalidateQueries({ queryKey: ['extension-tokens'] })
    },
    onError: (e: Error) => {
      toast.error(e.message, 'Token Error')
    },
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/extension/token', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Failed to revoke token')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extension-tokens'] })
      toast.success('Token revoked', 'Done')
    },
  })

  function copyToken() {
    if (!newToken) return
    navigator.clipboard.writeText(newToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Token copied to clipboard!')
    })
  }

  const tokens = data?.tokens ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(168,85,247,0.1)' }}>
          <Chrome size={16} style={{ color: '#a855f7' }} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>Chrome Extension</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>Generate API tokens to connect the ARIA extension</p>
        </div>
      </div>

      {/* New token reveal */}
      {newToken && (
        <div
          className="mb-4 p-4 rounded-xl space-y-3"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={13} style={{ color: '#a855f7' }} />
            <p className="text-[12px] font-medium" style={{ color: '#a855f7' }}>
              Copy this token now — it won't be shown again
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-lg px-3 py-2 font-mono text-[11px] truncate select-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
            >
              {visible ? newToken : '•'.repeat(20)}
            </div>
            <button
              onClick={() => setVisible(v => !v)}
              className="p-2 rounded-lg"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-2)' }}
            >
              {visible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              onClick={copyToken}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
              style={{ background: copied ? 'var(--green-subtle)' : 'rgba(168,85,247,0.15)', color: copied ? 'var(--green)' : '#a855f7' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            Paste this in the Chrome Extension settings → API Token field.
          </p>
        </div>
      )}

      {/* Token list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-3)' }}>
          <Loader2 size={13} className="animate-spin" />
          <span className="text-[12px]">Loading tokens…</span>
        </div>
      ) : tokens.length > 0 ? (
        <div className="space-y-2 mb-4">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <Chrome size={12} style={{ color: '#a855f7' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-1)' }}>{t.label}</p>
                <p className="text-[10.5px]" style={{ color: 'var(--text-3)' }}>
                  Last used: {formatDate(t.lastUsedAt)} · Created {formatDate(t.createdAt)}
                </p>
              </div>
              <button
                onClick={() => deleteMut.mutate(t.id)}
                disabled={deleteMut.isPending}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                style={{ color: 'var(--text-3)' }}
                title="Revoke token"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] mb-4 py-2" style={{ color: 'var(--text-3)' }}>
          No tokens yet. Generate one to connect the Chrome Extension.
        </p>
      )}

      {/* Generate form */}
      {tokens.length < 5 && (
        <div className="flex items-center gap-2">
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Token label (e.g. Work Laptop)"
            className="flex-1 rounded-lg px-3 py-2 text-[12px] outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
            maxLength={40}
          />
          <button
            onClick={() => createMut.mutate(labelInput || 'Chrome Extension')}
            disabled={createMut.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium shrink-0 transition-opacity"
            style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', opacity: createMut.isPending ? 0.6 : 1 }}
          >
            {createMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Generate Token
          </button>
        </div>
      )}
    </div>
  )
}
