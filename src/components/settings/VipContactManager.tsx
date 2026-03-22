'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Trash2, Plus, Loader2, UserCheck } from 'lucide-react'

interface VipContact {
  id: string
  email: string
  name: string | null
  reason: string | null
  createdAt: string
}

export function VipContactManager() {
  const qc = useQueryClient()
  const [emailInput, setEmailInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')
  const [formError, setFormError] = useState('')

  const { data, isLoading } = useQuery<{ data: VipContact[] }>({
    queryKey: ['vip-contacts'],
    queryFn: async () => {
      const res = await fetch('/api/vip')
      if (!res.ok) throw new Error('Failed to fetch VIP contacts')
      return res.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async (payload: { email: string; name?: string; reason?: string }) => {
      const res = await fetch('/api/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to add VIP contact')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vip-contacts'] })
      setEmailInput('')
      setNameInput('')
      setReasonInput('')
      setFormError('')
    },
    onError: (err) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/vip', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Failed to remove VIP contact')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vip-contacts'] }),
  })

  const handleAdd = () => {
    setFormError('')
    if (!emailInput.trim()) {
      setFormError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setFormError('Enter a valid email address')
      return
    }
    addMutation.mutate({
      email: emailInput.trim(),
      name: nameInput.trim() || undefined,
      reason: reasonInput.trim() || undefined,
    })
  }

  const contacts = data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-subtle)' }}
        >
          <Star size={16} style={{ color: 'var(--accent-text)' }} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>VIP Contacts</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            Emails from VIP contacts are always prioritised
          </p>
        </div>
      </div>

      {/* Add form */}
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
          Add VIP Contact
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="email@example.com *"
            type="email"
            className="rounded-lg px-3 py-2.5 text-[13px] outline-none transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Display name (optional)"
            className="rounded-lg px-3 py-2.5 text-[13px] outline-none transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        <input
          value={reasonInput}
          onChange={(e) => setReasonInput(e.target.value)}
          placeholder="Reason / note (optional)"
          className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-1)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {formError && (
          <p className="text-[12px]" style={{ color: 'var(--red)' }}>{formError}</p>
        )}
        <button
          onClick={handleAdd}
          disabled={addMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {addMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {addMutation.isPending ? 'Adding…' : 'Add VIP Contact'}
        </button>
      </div>

      {/* List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-hover)' }}
            >
              <UserCheck size={16} style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>No VIP contacts yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {contacts.map((contact, i) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < contacts.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  {(contact.name || contact.email)[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {contact.name && (
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                      {contact.name}
                    </p>
                  )}
                  <p className="text-[12px] truncate" style={{ color: contact.name ? 'var(--text-3)' : 'var(--text-2)' }}>
                    {contact.email}
                  </p>
                  {contact.reason && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {contact.reason}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteMutation.mutate(contact.email)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === contact.email}
                  className="p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-40"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--red)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
                  title="Remove from VIP"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
