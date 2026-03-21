import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'
import { CommandPalette } from '@/components/CommandPalette'
import { NotificationManager } from '@/components/NotificationManager'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto grid-bg pb-16 md:pb-0 min-w-0">
        {children}
      </main>

      {/* Right AI panel — desktop only */}
      <div className="hidden lg:block w-[280px] xl:w-[300px] shrink-0">
        <AnalysisPanel />
      </div>

      <CommandPalette />
      <NotificationManager />

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
