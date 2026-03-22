'use client'

import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { VipContactManager } from '@/components/settings/VipContactManager'

export default function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-10"
    >
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Settings size={16} style={{ color: 'var(--accent-text)' }} />
        </div>
        <div>
          <h1 className="font-outfit text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Settings
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Manage your ARIA preferences
          </p>
        </div>
      </div>

      {/* VIP Contacts section */}
      <section>
        <VipContactManager />
      </section>
    </motion.div>
  )
}
