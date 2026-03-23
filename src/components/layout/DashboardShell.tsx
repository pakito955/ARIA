'use client'

import dynamic from 'next/dynamic'

// All client-only overlays are lazy-loaded here — they are NOT needed on initial paint
// ssr: false is required since these use browser APIs (window, document, speech)
const AnalysisPanel     = dynamic(() => import('@/components/analysis/AnalysisPanel').then(m => ({ default: m.AnalysisPanel })), { ssr: false })
const CommandPalette    = dynamic(() => import('@/components/CommandPalette').then(m => ({ default: m.CommandPalette })), { ssr: false })
const NotificationManager = dynamic(() => import('@/components/NotificationManager').then(m => ({ default: m.NotificationManager })), { ssr: false })
const ComposeModal      = dynamic(() => import('@/components/ComposeModal').then(m => ({ default: m.ComposeModal })), { ssr: false })
const OnboardingFlow    = dynamic(() => import('@/components/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })), { ssr: false })
const KeyboardShortcuts = dynamic(() => import('@/components/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts })), { ssr: false })
const VoiceCommand      = dynamic(() => import('@/components/VoiceCommand').then(m => ({ default: m.VoiceCommand })), { ssr: false })

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Main content + AI panel side by side */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        <main className="flex-1 overflow-hidden pb-16 md:pb-0 min-w-0 relative z-10">
          {children}
        </main>

        {/* AI Panel — in-flow, pushes main content */}
        <AnalysisPanel />
      </div>

      <CommandPalette />
      <NotificationManager />
      <ComposeModal />
      <OnboardingFlow />
      <KeyboardShortcuts />

      {/* Floating Voice Agent Button */}
      <div className="fixed bottom-20 md:bottom-8 right-6 z-[100]">
        <VoiceCommand />
      </div>
    </>
  )
}
