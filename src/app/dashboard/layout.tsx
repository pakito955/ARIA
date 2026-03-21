import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'
import { CommandPalette } from '@/components/CommandPalette'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="h-[52px] shrink-0">
        <Topbar />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#080810] grid-bg">
          {children}
        </main>
        <div className="w-[280px] shrink-0">
          <AnalysisPanel />
        </div>
      </div>
      <CommandPalette />
    </div>
  )
}
