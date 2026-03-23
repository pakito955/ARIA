import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'
import { CommandPalette } from '@/components/CommandPalette'
import { NotificationManager } from '@/components/NotificationManager'
import { PageTransition } from '@/components/layout/PageTransition'
import { ToastContainer } from '@/components/ui/Toast'
import { ComposeModal } from '@/components/ComposeModal'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#0B0B0F' }}>
      {/* Ambient gradient orbs */}
      <div className="mesh-bg" />
      {/* Film grain noise overlay */}
      <div className="noise-overlay" />

      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0 relative z-10">
        <Sidebar />
      </div>

      {/* Main content + AI panel side by side */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        <main
          className="flex-1 overflow-hidden pb-16 md:pb-0 min-w-0 relative z-10"
          style={{ background: '#0B0B0F' }}
        >
          <PageTransition>
            {children}
          </PageTransition>
        </main>

        {/* AI Panel — in-flow, pushes main content */}
        <AnalysisPanel />
      </div>

      <CommandPalette />
      <NotificationManager />
      <ToastContainer />
      <ComposeModal />
      <OnboardingFlow />
      <KeyboardShortcuts />

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
