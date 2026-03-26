import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { PageTransition } from '@/components/layout/PageTransition'
import { ToastContainer } from '@/components/ui/Toast'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Ambient scene-lighting orbs — fixed, dark-mode only visible */}
      <div className="ambient-orb ambient-orb-orange" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-purple" aria-hidden="true" />

      {/* Desktop sidebar — static, server-rendered */}
      <div className="hidden md:block shrink-0 relative z-10">
        <Sidebar />
      </div>

      {/* Client shell: lazy-loads overlays + AI panel */}
      <DashboardShell>
        <PageTransition>
          {children}
        </PageTransition>
      </DashboardShell>

      {/* Toast notifications — lightweight, always needed */}
      <ToastContainer />

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
