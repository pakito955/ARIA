import { create } from 'zustand'
import type { AppStore } from '@/types'

export const useAppStore = create<AppStore>((set) => ({
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
}))

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
