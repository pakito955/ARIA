'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Clock, CalendarPlus, Loader2, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from '@/lib/store'
import { TaskItemSkeleton } from '@/components/ui/Skeletons'

interface CalendarSlot {
  startTime: string
  endTime: string
  label: string
  reasoning: string
}

interface ScheduleModal {
  taskId: string
  taskTitle: string
}

function ScheduleTaskModal({ taskId, taskTitle, onClose }: { taskId: string; taskTitle: string; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['task-schedule', taskId],
    queryFn: async () => {
      const res = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      return res.json()
    },
    staleTime: 0,
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, confirm: true, slotIndex: selectedSlot }),
      })
      if (!res.ok) throw new Error('Failed to schedule')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Scheduled to calendar', 'ARIA auto-scheduled')
      onClose()
    },
    onError: () => toast.error('Failed to create calendar event'),
  })

  const slots: CalendarSlot[] = data?.suggestion?.suggestedSlots || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[2px] mb-1" style={{ color: 'var(--accent-text)' }}>ARIA · Smart Schedule</p>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>Schedule Time Block</h3>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{taskTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors" style={{ color: 'var(--text-3)' }}>
            <X size={14} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>Analyzing your calendar…</p>
          </div>
        ) : slots.length === 0 ? (
          <p className="text-[12px] text-center py-6" style={{ color: 'var(--text-3)' }}>
            Could not find available time slots. Try connecting your calendar.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[1.5px]" style={{ color: 'var(--text-3)' }}>
              Suggested Slots · ~{data?.suggestion?.estimatedMinutes}min
            </p>
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => setSelectedSlot(i)}
                className={cn(
                  'w-full text-left p-3.5 rounded-xl transition-all',
                  selectedSlot === i
                    ? 'border-[var(--accent)]'
                    : 'border-[var(--border)] hover:border-[var(--border-medium)]'
                )}
                style={{
                  background: selectedSlot === i ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                  border: `1px solid ${selectedSlot === i ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>{slot.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{slot.reasoning}</p>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all"
                    style={{ borderColor: selectedSlot === i ? 'var(--accent)' : 'var(--border-medium)', background: selectedSlot === i ? 'var(--accent)' : 'transparent' }}
                  >
                    {selectedSlot === i && <Check size={8} className="text-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => confirmMutation.mutate()}
            disabled={slots.length === 0 || confirmMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {confirmMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={13} />}
            Block Time
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-[12px] border" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)
  const [scheduleModal, setScheduleModal] = useState<ScheduleModal | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks')
      return res.json()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setNewTask('')
      setAdding(false)
      toast.success('Task added', 'New task')
    },
  })

  const tasks = data?.data || []
  const today = tasks.filter((t: any) => t.status !== 'DONE')
  const done = tasks.filter((t: any) => t.status === 'DONE')
  const completionPct = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div>
          <h1 className="font-outfit text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>Tasks</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>Auto-generated from emails · Schedule with ARIA</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>Completed</p>
            <p className="font-mono text-sm" style={{ color: 'var(--text-1)' }}>{completionPct}%</p>
          </div>
          <div className="w-16 h-16 relative">
            <svg viewBox="0 0 36 36" className="rotate-[-90deg]">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="var(--green)"
                strokeWidth="2.5"
                strokeDasharray={`${completionPct * 0.942} 94.2`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Add task */}
        {adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTask.trim()) createMutation.mutate(newTask.trim())
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="Task name… (Press Enter to add)"
              className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            />
            <button
              onClick={() => newTask.trim() && createMutation.mutate(newTask.trim())}
              className="px-4 py-2 rounded-xl text-[12px] font-medium text-white"
              style={{ background: 'var(--accent)' }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-[11px] transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <Plus size={13} />
            New Task
          </button>
        )}

        {/* Active tasks */}
        <Section title="Active" count={today.length}>
          {isLoading ? (
            <TaskItemSkeleton count={4} />
          ) : today.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 gap-3"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="1" y="1" width="20" height="20" rx="4" stroke="var(--border-medium)" strokeWidth="1.5"/>
                  <path d="M7 11l3 3 5-5" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>All caught up!</p>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>No active tasks right now</p>
              </div>
            </motion.div>
          ) : (
            today.map((task: any, i: number) => (
              <TaskItem
                key={task.id}
                task={task}
                index={i}
                onToggle={() => toggleMutation.mutate({ id: task.id, status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                onSchedule={() => setScheduleModal({ taskId: task.id, taskTitle: task.title })}
              />
            ))
          )}
        </Section>

        {done.length > 0 && (
          <Section title="Completed" count={done.length}>
            {done.map((task: any, i: number) => (
              <TaskItem
                key={task.id}
                task={task}
                index={i}
                onToggle={() => toggleMutation.mutate({ id: task.id, status: 'TODO' })}
                onSchedule={() => {}}
              />
            ))}
          </Section>
        )}
      </div>

      {/* Schedule modal */}
      <AnimatePresence>
        {scheduleModal && (
          <ScheduleTaskModal
            taskId={scheduleModal.taskId}
            taskTitle={scheduleModal.taskTitle}
            onClose={() => setScheduleModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[2px] mb-2" style={{ color: 'var(--text-2)' }}>
        {title} <span style={{ color: 'var(--text-3)' }}>({count})</span>
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function TaskItem({ task, index, onToggle, onSchedule }: any) {
  const isDone = task.status === 'DONE'
  const priorityColors: Record<string, string> = {
    CRITICAL: 'var(--red)',
    HIGH: 'var(--amber)',
    MEDIUM: 'var(--blue)',
    LOW: 'var(--border-medium)',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 p-2.5 rounded-lg group transition-colors hover:bg-[var(--bg-hover)]"
      style={{ background: 'var(--bg-card)' }}
    >
      <button
        className={cn(
          'w-3.5 h-3.5 rounded shrink-0 border mt-0.5 flex items-center justify-center transition-all',
          isDone ? 'border-[var(--green)]' : 'border-[var(--border-medium)] group-hover:border-[var(--accent)]'
        )}
        style={{ background: isDone ? 'var(--green)' : 'transparent' }}
        onClick={onToggle}
      >
        {isDone && <Check size={9} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <p className={cn('text-[11.5px] transition-all', isDone && 'line-through opacity-50')} style={{ color: 'var(--text-1)' }}>
          {task.title}
        </p>
        {task.email && (
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--blue)' }}>{task.email.fromName || task.email.fromEmail}</p>
        )}
        {task.source === 'AI_GENERATED' && !task.email && (
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--accent-text)' }}>ARIA auto-generated</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.dueDate && (
          <div className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--text-2)' }}>
            <Clock size={9} />
            {format(new Date(task.dueDate), 'd.M.')}
          </div>
        )}
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: priorityColors[task.priority] || 'var(--border-medium)' }} />
        {!isDone && (
          <button
            onClick={onSchedule}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all"
            style={{ color: 'var(--accent-text)', background: 'var(--accent-subtle)' }}
            title="Schedule with ARIA"
          >
            <CalendarPlus size={10} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
