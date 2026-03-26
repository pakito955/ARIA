import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { persist } from 'zustand/middleware'
import { startTransition } from 'react'
import type { AppStore, BrainDumpResult, UnifiedEmail } from '@/types'

// ── Email cache store (fast O(1) lookups + SSE event handlers) ───────────────

interface SidebarStats {
  unread: number
  critical: number
  tasks: number
  waiting: number
}

interface EmailCacheState {
  emailMap: Map<string, UnifiedEmail>
  stats: SidebarStats
  handleEmailNew: (email: UnifiedEmail) => void
  handleEmailUpdated: (email: UnifiedEmail) => void
  handleEmailDeleted: (id: string) => void
  handleStatsUpdate: (stats: SidebarStats) => void
}

export const useEmailCache = create<EmailCacheState>()((set) => ({
  emailMap: new Map(),
  stats: { unread: 0, critical: 0, tasks: 0, waiting: 0 },

  handleEmailNew: (email) => {
    startTransition(() => {
      set((state) => {
        const next = new Map(state.emailMap)
        next.set(email.id, email)
        return { emailMap: next }
      })
    })
  },

  handleEmailUpdated: (email) => {
    startTransition(() => {
      set((state) => {
        if (!state.emailMap.has(email.id)) return state
        const next = new Map(state.emailMap)
        next.set(email.id, email)
        return { emailMap: next }
      })
    })
  },

  handleEmailDeleted: (id) => {
    startTransition(() => {
      set((state) => {
        if (!state.emailMap.has(id)) return state
        const next = new Map(state.emailMap)
        next.delete(id)
        return { emailMap: next }
      })
    })
  },

  handleStatsUpdate: (stats) => {
    set({ stats })
  },
}))

// ── Email cache selectors ─────────────────────────────────────────────────────

export const selectEmail =
  (id: string) =>
  (state: EmailCacheState): UnifiedEmail | undefined =>
    state.emailMap.get(id)

export const selectUnreadCount = (state: EmailCacheState): number => state.stats.unread

export const selectCriticalEmails = (state: EmailCacheState): UnifiedEmail[] => {
  const out: UnifiedEmail[] = []
  for (const email of state.emailMap.values()) {
    if ((email as any).analysis?.priority === 'CRITICAL') out.push(email)
  }
  return out
}

export const useEmailById = (id: string) => useEmailCache(useShallow(selectEmail(id)))
export const useUnreadCount = () => useEmailCache((s) => s.stats.unread)
export const useSidebarStats = () => useEmailCache(useShallow((s) => s.stats))

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      selectedEmailId: null,
      setSelectedEmail: (id) => set({ selectedEmailId: id }),

      commandOpen: false,
      setCommandOpen: (open) => set({ commandOpen: open }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      rightPanel: 'analysis',
      setRightPanel: (panel) => set({ rightPanel: panel }),

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      emailFilter: 'all',
      setEmailFilter: (f) => set({ emailFilter: f }),

      focusMode: false,
      setFocusMode: (v) => set({ focusMode: v }),

      contactPanelEmail: null,
      setContactPanelEmail: (email) => set({ contactPanelEmail: email }),

      newEmailsCount: 0,
      setNewEmailsCount: (n) => set({ newEmailsCount: n }),

      toasts: [],
      addToast: (t) =>
        set((state) => ({
          toasts: [
            ...state.toasts.slice(-4),
            { ...t, id: Math.random().toString(36).slice(2, 9) },
          ],
        })),
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      composeOpen: false,
      setComposeOpen: (open) => set({ composeOpen: open }),

      batchMode: false,
      setBatchMode: (v) => set({ batchMode: v }),

      smartSearchMode: false,
      setSmartSearchMode: (v) => set({ smartSearchMode: v }),

      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

      approvalQueueOpen: false,
      setApprovalQueueOpen: (open) => set({ approvalQueueOpen: open }),

      brainDumpMode: false,
      setBrainDumpMode: (v) => set({ brainDumpMode: v }),

      brainDumpResult: null,
      setBrainDumpResult: (r) => set({ brainDumpResult: r }),
    }),
    {
      name: 'aria-ui-prefs',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)

// ── Selector hooks — subscribe to only the slice you need ─────────────────
// Usage: const { selectedEmailId, setSelectedEmail } = useEmailSelection()
export const useEmailSelection = () => useAppStore(
  useShallow((s) => ({ selectedEmailId: s.selectedEmailId, setSelectedEmail: s.setSelectedEmail }))
)
export const useInboxFilters = () => useAppStore(
  useShallow((s) => ({
    emailFilter: s.emailFilter, setEmailFilter: s.setEmailFilter,
    searchQuery: s.searchQuery, setSearchQuery: s.setSearchQuery,
    focusMode: s.focusMode, setFocusMode: s.setFocusMode,
  }))
)
export const useUIState = () => useAppStore(
  useShallow((s) => ({
    commandOpen: s.commandOpen, setCommandOpen: s.setCommandOpen,
    composeOpen: s.composeOpen, setComposeOpen: s.setComposeOpen,
    aiPanelOpen: s.aiPanelOpen, setAiPanelOpen: s.setAiPanelOpen,
    rightPanel: s.rightPanel, setRightPanel: s.setRightPanel,
  }))
)

// Convenience helper — call from anywhere without hooks
export const toast = {
  success: (message: string, title?: string) =>
    useAppStore.getState().addToast({ type: 'success', message, title }),
  error: (message: string, title?: string) =>
    useAppStore.getState().addToast({ type: 'error', message, title }),
  info: (message: string, title?: string) =>
    useAppStore.getState().addToast({ type: 'info', message, title }),
  warning: (message: string, title?: string) =>
    useAppStore.getState().addToast({ type: 'warning', message, title }),
}
