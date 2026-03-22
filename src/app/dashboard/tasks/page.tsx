'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function TasksPage() {
  const qc = useQueryClient()
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)

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
          <h1 className="font-outfit text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-[11px] text-[var(--text-2)] mt-0.5">Auto-generated from emails</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-[var(--text-2)]">Completed</p>
            <p className="font-mono text-sm text-white">{completionPct}%</p>
          </div>
          <div className="w-16 h-16 relative">
            <svg viewBox="0 0 36 36" className="rotate-[-90deg]">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="#86efac"
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
              className="flex-1 bg-[var(--bg-card)] border border-[#e8c97a]/30 rounded px-3 py-2 text-sm text-white placeholder:text-[var(--text-3)] outline-none"
            />
            <button
              onClick={() => newTask.trim() && createMutation.mutate(newTask.trim())}
              className="px-3 py-2 bg-[#e8c97a] text-[#080810] rounded text-xs font-semibold"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-[11px] text-[var(--text-3)] hover:text-[#e8c97a] transition-colors"
          >
            <Plus size={13} />
            New Task
          </button>
        )}

        {/* Active tasks */}
        <Section title="Active" count={today.length}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded skeleton" />
            ))
          ) : (
            today.map((task: any, i: number) => (
              <TaskItem
                key={task.id}
                task={task}
                index={i}
                onToggle={() =>
                  toggleMutation.mutate({ id: task.id, status: task.status === 'DONE' ? 'TODO' : 'DONE' })
                }
              />
            ))
          )}
        </Section>

        {/* Done tasks */}
        {done.length > 0 && (
          <Section title="Completed" count={done.length}>
            {done.map((task: any, i: number) => (
              <TaskItem
                key={task.id}
                task={task}
                index={i}
                onToggle={() =>
                  toggleMutation.mutate({ id: task.id, status: 'TODO' })
                }
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[2px] text-[var(--text-2)] mb-2">
        {title} <span className="text-[var(--text-3)]">({count})</span>
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function TaskItem({ task, index, onToggle }: any) {
  const isDone = task.status === 'DONE'
  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-[#f4a0b5]',
    HIGH: 'bg-[#e8c97a]',
    MEDIUM: 'bg-[#7eb8f7]',
    LOW: 'bg-[#5a5a78]',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 p-2.5 rounded bg-[var(--bg-card)] hover:bg-[#121224] transition-colors cursor-pointer group"
      onClick={onToggle}
    >
      <div className={cn(
        'w-3.5 h-3.5 rounded shrink-0 border mt-0.5 flex items-center justify-center transition-all',
        isDone
          ? 'bg-[#86efac] border-[#86efac]'
          : 'border-white/20 group-hover:border-[#e8c97a]/50'
      )}>
        {isDone && <Check size={9} className="text-[#080810]" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[11.5px] transition-all',
          isDone && 'line-through text-[var(--text-3)]'
        )}>
          {task.title}
        </p>
        {task.email && (
          <p className="text-[9px] text-[#4fd1c5] mt-0.5">{task.email.fromName || task.email.fromEmail}</p>
        )}
        {task.source === 'AI_GENERATED' && !task.email && (
          <p className="text-[9px] text-[#e8c97a] mt-0.5">ARIA auto-generated</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.dueDate && (
          <div className="flex items-center gap-1 text-[9px] text-[var(--text-2)]">
            <Clock size={9} />
            {format(new Date(task.dueDate), 'd.M.')}
          </div>
        )}
        <div className={cn('w-1.5 h-1.5 rounded-full', priorityColors[task.priority] || 'bg-[#5a5a78]')} />
      </div>
    </motion.div>
  )
}
