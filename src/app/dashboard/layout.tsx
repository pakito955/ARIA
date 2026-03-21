import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
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
    <div className="h-screen flex overflow-hidden bg-[#07070f]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto grid-bg">
        {children}
      </main>
      <div className="w-[320px] shrink-0">
        <AnalysisPanel />
      </div>
      <CommandPalette />
    </div>
  )
}
