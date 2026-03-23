'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { X, RotateCcw, GripVertical, Check, Plus, LayoutDashboard } from 'lucide-react'
import { WIDGET_REGISTRY, getWidgetDef, type WidgetCategory } from '@/lib/widgets'
import { useWidgetConfig } from '@/hooks/useWidgetConfig'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/store'

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  productivity: '⚡ Productivity',
  analytics: '📊 Analytics',
  ai: '🧠 AI',
  tools: '🛠 Tools',
}

const SIZE_LABEL: Record<string, string> = {
  '1/3': 'Small',
  '2/3': 'Medium',
  'full': 'Full width',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function WidgetGallery({ open, onClose }: Props) {
  const { config, reorder, toggle, reset } = useWidgetConfig()
  const [activeTab, setActiveTab] = useState<'active' | 'gallery'>('active')
  const [filter, setFilter] = useState<WidgetCategory | 'all'>('all')

  const enabledIds = config.order
  const disabledIds = config.disabled

  const filtered = WIDGET_REGISTRY.filter((w) =>
    filter === 'all' || w.category === filter
  )

  const handleReset = () => {
    reset()
    toast.success('Dashboard reset to defaults', 'Widgets reset')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed left-1/2 top-1/2 z-[501] -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}
                >
                  <LayoutDashboard size={14} className="text-[var(--accent-text)]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">Widget Gallery</p>
                  <p className="text-[10px] text-[var(--text-3)]">Customize your dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-all"
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 pb-0 flex gap-1 shrink-0">
              {[
                { key: 'active', label: `Active (${enabledIds.length})` },
                { key: 'gallery', label: `Gallery (${WIDGET_REGISTRY.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'active' | 'gallery')}
                  className={cn(
                    'px-3 py-2 text-[12px] rounded-t-lg border-b-2 transition-all',
                    activeTab === tab.key
                      ? 'text-white border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'text-[var(--text-3)] border-transparent hover:text-[var(--text-2)]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="h-[1px] bg-[var(--border)] mx-0 shrink-0" />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'active' ? (
                /* Active Widgets — draggable reorder */
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-3">
                    Drag to reorder · Toggle to hide
                  </p>
                  <Reorder.Group
                    axis="y"
                    values={enabledIds}
                    onReorder={reorder}
                    className="space-y-2"
                  >
                    {enabledIds.map((id) => {
                      const def = getWidgetDef(id)
                      if (!def) return null
                      return (
                        <Reorder.Item
                          key={id}
                          value={id}
                          className="list-none"
                          whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                        >
                          <div
                            className="flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                          >
                            <GripVertical size={14} className="text-[var(--text-3)] shrink-0" />
                            <span className="text-xl shrink-0">{def.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-white">{def.name}</p>
                              <p className="text-[10px] text-[var(--text-3)] truncate">{def.description}</p>
                            </div>
                            <span
                              className="text-[9px] px-2 py-0.5 rounded-full shrink-0"
                              style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
                            >
                              {SIZE_LABEL[def.size]}
                            </span>
                            <button
                              onClick={() => toggle(id, false)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0"
                              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}
                              title="Remove widget"
                            >
                              <X size={11} className="text-[var(--accent-text)]" />
                            </button>
                          </div>
                        </Reorder.Item>
                      )
                    })}
                  </Reorder.Group>

                  {/* Disabled widgets quick add */}
                  {disabledIds.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-2">Hidden widgets</p>
                      <div className="flex flex-wrap gap-2">
                        {disabledIds.map((id) => {
                          const def = getWidgetDef(id)
                          if (!def) return null
                          return (
                            <button
                              key={id}
                              onClick={() => { toggle(id, true); toast.success(`${def.name} added to dashboard`) }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all"
                              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                            >
                              <Plus size={10} />
                              {def.icon} {def.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Gallery — all widgets with preview */
                <>
                  {/* Category filter */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(['all', 'productivity', 'analytics', 'ai', 'tools'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[10.5px] transition-all',
                          filter === cat
                            ? 'bg-[var(--accent)]/12 text-[var(--accent-text)] border border-[var(--accent)]'
                            : 'text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--border-medium)] hover:text-white'
                        )}
                      >
                        {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>

                  {/* Widget cards grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {filtered.map((def) => {
                      const isEnabled = enabledIds.includes(def.id)
                      return (
                        <motion.div
                          key={def.id}
                          layout
                          className={cn(
                            'relative p-4 rounded-xl transition-all cursor-pointer',
                            isEnabled
                              ? 'ring-1 ring-[var(--accent)]'
                              : 'hover:border-[var(--border-medium)]'
                          )}
                          style={{
                            background: isEnabled ? 'color-mix(in srgb, var(--accent) 5%, var(--bg-surface))' : 'var(--bg-surface)',
                            border: `1px solid ${isEnabled ? 'var(--accent)' : 'var(--border)'}`,
                          }}
                          onClick={() => {
                            if (isEnabled) {
                              toggle(def.id, false)
                              toast.info(`${def.name} removed from dashboard`)
                            } else {
                              toggle(def.id, true)
                              toast.success(`${def.name} added to dashboard`)
                            }
                          }}
                        >
                          {isEnabled && (
                            <div
                              className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: 'var(--accent)' }}
                            >
                              <Check size={10} className="text-white" />
                            </div>
                          )}

                          <div className="flex items-start gap-3 mb-2">
                            <span className="text-2xl">{def.icon}</span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-white pr-6">{def.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-[var(--text-3)]">{SIZE_LABEL[def.size]}</span>
                                <span className="text-[9px] text-[var(--text-3)] opacity-50">·</span>
                                <span className="text-[9px]" style={{ color: 'var(--accent-text)' }}>
                                  {CATEGORY_LABELS[def.category].split(' ')[1]}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-[10.5px] text-[var(--text-3)] leading-relaxed">
                            {def.description}
                          </p>

                          {/* Preview bar */}
                          <div
                            className="mt-3 h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--bg-hover)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: def.size === '2/3' ? '66%' : def.size === 'full' ? '100%' : '33%',
                                background: isEnabled ? 'var(--accent)' : 'var(--border-medium)',
                              }}
                            />
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-3 border-t border-[var(--border)] flex items-center justify-between shrink-0"
              style={{ background: 'var(--bg-surface)' }}
            >
              <p className="text-[11px] text-[var(--text-3)]">
                {enabledIds.length} active widget{enabledIds.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
