'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalendarDays, CheckSquare, Mail, BookOpen, Loader2,
  Clock, Users, ExternalLink, Sparkles, MapPin, ChevronDown
} from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DailyBriefingData, AgendaItem } from '@/types'

function MeetingCard({ event, index }: { event: AgendaItem; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const durationMins = Math.round((end.getTime() - start.getTime()) / 60000)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-[var(--bg-hover)] transition-colors"
      >
        {/* Time column */}
        <div className="w-14 shrink-0 text-center">
          <p className="text-[13px] font-bold font-mono" style={{ color: 'var(--accent-text)' }}>
            {format(start, 'HH:mm')}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {durationMins}m
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--text-1)' }}>
            {event.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {event.participants.length > 0 && (
              <div className="flex items-center gap-1">
                <Users size={10} style={{ color: 'var(--text-3)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  {event.participants.slice(0, 3).join(', ')}{event.participants.length > 3 ? ` +${event.participants.length - 3}` : ''}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin size={10} style={{ color: 'var(--text-3)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{event.location}</span>
              </div>
            )}
            {event.meetingUrl && (
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] transition-colors hover:opacity-80"
                style={{ color: 'var(--blue)' }}
              >
                <ExternalLink size={9} />
                Join
              </a>
            )}
          </div>
        </div>

        {event.prepNotes && (
          <ChevronDown
            size={14}
            style={{ color: 'var(--text-3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        )}
      </button>

      {/* Prep notes */}
      {expanded && event.prepNotes && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className="px-5 pb-5 pt-1 ml-[72px]"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-1.5 mb-2 pt-3">
              <Sparkles size={10} style={{ color: 'var(--accent-text)' }} />
              <span className="text-[9px] uppercase tracking-[1.5px]" style={{ color: 'var(--accent-text)' }}>
                ARIA Prep Notes
              </span>
            </div>
            <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
              {event.prepNotes}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function BriefingPage() {
  const { data, isLoading, error } = useQuery<DailyBriefingData>({
    queryKey: ['daily-briefing'],
    queryFn: async () => {
      const res = await fetch('/api/briefing/daily')
      if (!res.ok) throw new Error('Failed to load briefing')
      return res.json()
    },
    staleTime: 10 * 60_000,
  })

  const today = new Date()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[9px] tracking-[2.5px] uppercase" style={{ color: 'var(--accent-text)' }}>
            ARIA · Morning Briefing
          </span>
        </div>
        <h1 className="font-outfit text-3xl font-light tracking-tight" style={{ color: 'var(--text-1)' }}>
          {format(today, 'EEEE, d MMMM')}
        </h1>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          Your personalized daily executive briefing
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                ARIA is preparing your briefing…
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                Analyzing calendar, emails, and contacts
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
              Connect Gmail to get your morning briefing.
            </p>
          </div>
        )}

        {data && (
          <>
            {/* AI Briefing Summary */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(124,92,255,0.08) 0%, var(--bg-card) 60%)',
                border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,92,255,0.10), transparent 70%)' }} />
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} style={{ color: 'var(--accent-text)' }} />
                <span className="text-[9px] uppercase tracking-[2px]" style={{ color: 'var(--accent-text)' }}>ARIA Analysis</span>
              </div>
              <div
                className="text-[13px] leading-relaxed"
                style={{ color: 'var(--text-2)' }}
                dangerouslySetInnerHTML={{ __html: data.briefingText }}
              />
            </motion.div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Critical emails', value: data.criticalEmails.length, icon: Mail, color: 'var(--red)' },
                { label: 'Active tasks', value: data.pendingTasks.length, icon: CheckSquare, color: 'var(--amber)' },
                { label: 'Drafts pending', value: data.pendingDrafts, icon: CalendarDays, color: 'var(--blue)' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06 }}
                  className="p-4 rounded-xl text-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <stat.icon size={14} className="mx-auto mb-1.5" style={{ color: stat.color }} />
                  <p className="font-outfit text-3xl font-light" style={{ color: 'var(--text-1)' }}>{stat.value}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Today's Agenda */}
            {data.agenda.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={13} style={{ color: 'var(--text-3)' }} />
                  <p className="text-[9px] uppercase tracking-[2px]" style={{ color: 'var(--text-3)' }}>
                    Today's Agenda · {data.agenda.length} event{data.agenda.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="space-y-2">
                  {data.agenda.map((event, i) => (
                    <MeetingCard key={event.id} event={event} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Critical emails */}
            {data.criticalEmails.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail size={13} style={{ color: 'var(--text-3)' }} />
                  <p className="text-[9px] uppercase tracking-[2px]" style={{ color: 'var(--text-3)' }}>
                    Critical Emails
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {data.criticalEmails.map((email, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ borderBottom: i < data.criticalEmails.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: email.priority === 'CRITICAL' ? 'var(--red)' : 'var(--amber)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-1)' }}>{email.subject}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>from {email.from}</p>
                      </div>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: email.priority === 'CRITICAL' ? 'var(--red-subtle)' : 'var(--amber-subtle)',
                          color: email.priority === 'CRITICAL' ? 'var(--red)' : 'var(--amber)',
                        }}
                      >
                        {email.priority}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Tasks */}
            {data.pendingTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare size={13} style={{ color: 'var(--text-3)' }} />
                  <p className="text-[9px] uppercase tracking-[2px]" style={{ color: 'var(--text-3)' }}>
                    Active Tasks
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {data.pendingTasks.slice(0, 5).map((task, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ borderBottom: i < Math.min(data.pendingTasks.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ borderColor: 'var(--border-medium)' }} />
                      <p className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-1)' }}>{task.title}</p>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Clock size={9} style={{ color: 'var(--text-3)' }} />
                          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                            {format(new Date(task.dueDate), 'd.M.')}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Intelligence */}
            {data.contactNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={13} style={{ color: 'var(--text-3)' }} />
                  <p className="text-[9px] uppercase tracking-[2px]" style={{ color: 'var(--text-3)' }}>
                    Contact Intelligence
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.contactNotes.map((note, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="p-3.5 rounded-xl"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <p className="text-[10px] font-medium truncate mb-1" style={{ color: 'var(--accent-text)' }}>
                        {note.email}
                      </p>
                      <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: 'var(--text-2)' }}>
                        {note.aiSummary || note.note}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
