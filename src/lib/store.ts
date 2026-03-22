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
}))
