'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Plus, X, Check,
  Clock, Mail, Zap, CalendarDays, AlertCircle,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isSameDay, addMonths, subMonths,
  startOfWeek, endOfWeek, parseISO, isPast, isFuture,
} from 'date-fns'
import { cn } from '@/lib/utils'

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#8b5cf6',
  LOW: '#4a4a6a',
}

const PRIORITY_BG: Record<string, string> = {
  CRITICAL: 'rgba(239,68,68,0.12)',
  HIGH: 'rgba(245,158,11,0.12)',
  MEDIUM: 'rgba(139,92,246,0.12)',
  LOW: 'rgba(74,74,106,0.1)',
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'MEDIUM' | 'HIGH' | 'CRITICAL' | 'LOW'>('MEDIUM')
  const qc = useQueryClient()

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks-calendar'],
    queryFn: async () => {
      const res = await fetch('/api/tasks')
      return res.json()
    },
    refetchInterval: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: async ({ title, dueDate, priority }: { title: string; dueDate: string; priority: string }) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dueDate, priority }),
      })
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks-calendar'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setNewTaskTitle('')
      setAddingTask(false)
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-calendar'] }),
  })

  const tasks: any[] = tasksData?.data || []

  // Build calendar grid — week starts Monday
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getTasksForDay = useCallback(
    (day: Date) => tasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), day)),
    [tasks]
  )

  const selectedDayTasks = getTasksForDay(selectedDay)
  const activeTasks = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
  const upcomingTasks = activeTasks
    .filter((t) => t.dueDate && isFuture(parseISO(t.dueDate)))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    createMutation.mutate({
      title: newTaskTitle.trim(),
      dueDate: selectedDay.toISOString(),
      priority: newTaskPriority,
    })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-[var(--border)] shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CalendarDays size={16} className="text-[var(--accent-text)]" />
            <h1 className="font-outfit text-xl md:text-2xl font-semibold tracking-tight">Calendar</h1>
          </div>
          <p className="text-xs text-[var(--text-2)]">
            {format(currentDate, 'MMMM yyyy')} &middot; {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-xl text-[var(--text-2)] hover:text-white hover:bg-[var(--bg-hover)] transition-all touch-target"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()) }}
            className="px-3 py-1.5 rounded-xl text-[11px] font-medium border border-[var(--border)] text-[var(--text-2)] hover:text-white hover:border-[var(--accent)] transition-all"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-xl text-[var(--text-2)] hover:text-white hover:bg-[var(--bg-hover)] transition-all touch-target"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 min-w-0">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div
                key={d}
                className="text-center text-[9px] md:text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayTasks = getTasksForDay(day)
              const isSelected = isSameDay(day, selectedDay)
              const isCurrent = isToday(day)
              const isThisMonth = isSameMonth(day, currentDate)
              const hasOverdue = dayTasks.some(
                (t) => t.status !== 'DONE' && isPast(parseISO(t.dueDate!)) && !isToday(day)
              )

              return (
                <motion.button
                  key={day.toISOString()}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'relative min-h-[52px] md:min-h-[76px] p-1 md:p-2 rounded-xl text-left transition-all flex flex-col',
                    isSelected
                      ? 'bg-[var(--accent)]/15 border border-[var(--accent)]'
                      : isCurrent
                      ? 'bg-white/[0.05] border border-[var(--border-medium)]'
                      : 'border border-transparent hover:bg-[var(--bg-hover)] hover:border-[var(--border)]',
                    !isThisMonth && 'opacity-25'
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      'text-[11px] md:text-[13px] font-semibold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full shrink-0',
                      isCurrent && 'bg-[var(--accent)] text-white',
                      !isCurrent && isSelected && 'text-[var(--accent-text)]',
                      !isCurrent && !isSelected && isThisMonth && 'text-[var(--text-1)]',
                      hasOverdue && !isCurrent && 'text-[var(--red)]'
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Task dots on mobile */}
                  {dayTasks.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5 md:hidden">
                      {dayTasks.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: t.status === 'DONE' ? '#4a4a6a' : (PRIORITY_COLOR[t.priority] || '#8b5cf6'),
                          }}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[7px] text-[var(--text-3)] leading-none">+{dayTasks.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Task chips on desktop */}
                  <div className="hidden md:flex flex-col gap-0.5 mt-1 min-w-0">
                    {dayTasks.slice(0, 2).map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          'text-[8px] truncate rounded-md px-1 py-0.5 block',
                          t.status === 'DONE' ? 'text-[var(--text-3)] line-through' : 'text-[var(--text-1)]'
                        )}
                        style={{ background: t.status === 'DONE' ? 'rgba(74,74,106,0.15)' : PRIORITY_BG[t.priority] }}
                      >
                        {t.title}
                      </span>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[8px] text-[var(--text-3)] pl-1">+{dayTasks.length - 2}</span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Upcoming tasks strip — desktop */}
          {upcomingTasks.length > 0 && (
            <div className="hidden md:block mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-[9px] uppercase tracking-[2px] text-[var(--text-3)] mb-3">Upcoming</p>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                {upcomingTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      setSelectedDay(parseISO(task.dueDate))
                      setCurrentDate(parseISO(task.dueDate))
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-medium)] cursor-pointer group transition-all"
                  >
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ background: PRIORITY_COLOR[task.priority] || '#8b5cf6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-medium truncate text-[var(--text-1)]">{task.title}</p>
                      <p className="text-[9px] text-[var(--text-2)] font-mono mt-0.5">
                        {format(parseISO(task.dueDate), 'EEE, d MMM')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Day Detail Panel */}
        <div className="lg:w-[260px] xl:w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] flex flex-col max-h-[50vh] lg:max-h-none">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[13px] font-semibold text-white">
                  {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEE, d MMM')}
                </p>
                <p className="text-[10px] text-[var(--text-2)] mt-0.5">
                  {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? 's' : ''}
                  {selectedDayTasks.filter((t) => t.status === 'DONE').length > 0 &&
                    ` · ${selectedDayTasks.filter((t) => t.status === 'DONE').length} done`}
                </p>
              </div>
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent)]/12 border border-[var(--accent)] text-[var(--accent-text)] text-[10px] hover:bg-[var(--accent)]/20 transition-all"
              >
                <Plus size={11} />
                Add
              </button>
            </div>

            {/* Add task form */}
            <AnimatePresence>
              {addingTask && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-2">
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask()
                        if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle('') }
                      }}
                      placeholder="Task name…"
                      className="w-full bg-[var(--bg-card)] border border-[var(--accent)] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    <div className="flex items-center gap-1.5">
                      {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setNewTaskPriority(p)}
                          className={cn(
                            'px-2 py-1 rounded-md text-[9px] font-medium transition-all',
                            newTaskPriority === p
                              ? 'text-white'
                              : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                          )}
                          style={
                            newTaskPriority === p
                              ? { background: PRIORITY_BG[p], color: PRIORITY_COLOR[p] }
                              : {}
                          }
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => { setAddingTask(false); setNewTaskTitle('') }}
                        className="ml-auto p-1 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <button
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim() || createMutation.isPending}
                      className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-[11px] font-medium hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                    >
                      {createMutation.isPending ? 'Adding…' : 'Add Task'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Task list for selected day */}
          <div className="flex-1 overflow-y-auto p-3">
            {selectedDayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <CalendarDays size={24} className="text-[#2a2a40]" />
                <p className="text-[11px] text-[var(--text-3)]">No tasks scheduled</p>
                <button
                  onClick={() => setAddingTask(true)}
                  className="text-[10px] text-[var(--accent-text)] hover:text-[var(--accent-text)] transition-colors"
                >
                  + Schedule a task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() =>
                      toggleMutation.mutate({
                        id: task.id,
                        status: task.status === 'DONE' ? 'TODO' : 'DONE',
                      })
                    }
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-medium)] cursor-pointer group transition-all"
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        'w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-all mt-0.5',
                        task.status === 'DONE'
                          ? 'bg-[#10b981] border-[#10b981]'
                          : 'border-white/[0.2] group-hover:border-[var(--accent)]'
                      )}
                    >
                      {task.status === 'DONE' && <Check size={10} className="text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-[12px] font-medium leading-tight',
                          task.status === 'DONE' && 'line-through text-[var(--text-3)]'
                        )}
                      >
                        {task.title}
                      </p>

                      {/* Source badges */}
                      {task.email && (
                        <p className="flex items-center gap-1 text-[9px] text-[#7eb8f7] mt-1.5">
                          <Mail size={8} />
                          {task.email.fromName || task.email.fromEmail}
                        </p>
                      )}
                      {task.source === 'AI_GENERATED' && !task.email && (
                        <p className="flex items-center gap-1 text-[9px] text-[var(--amber)] mt-1.5">
                          <Zap size={8} />
                          ARIA generated
                        </p>
                      )}
                    </div>

                    {/* Priority dot */}
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: PRIORITY_COLOR[task.priority] || '#4a4a6a' }}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue warning */}
          {(() => {
            const overdue = tasks.filter(
              (t) =>
                t.status !== 'DONE' &&
                t.dueDate &&
                isPast(parseISO(t.dueDate)) &&
                !isToday(parseISO(t.dueDate))
            )
            if (overdue.length === 0) return null
            return (
              <div className="border-t border-[var(--border)] px-3 py-2.5 shrink-0">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#ef4444]/08 border border-[#ef4444]/15">
                  <AlertCircle size={12} className="text-[var(--red)] shrink-0" />
                  <p className="text-[10px] text-[var(--red)]">
                    {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
