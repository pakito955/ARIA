'use client'

import { useQuery } from '@tanstack/react-query'
import { DollarSign, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function InvoicesWidget() {
  const { data: invoiceData } = useQuery({
    queryKey: ['dashboard-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoices')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60_000,
  })

  return (
    <div className="card-premium p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign size={13} className="text-[var(--green)]" />
          <span className="text-[9px] tracking-[2px] uppercase text-[var(--green)]">Invoices</span>
        </div>
        {(invoiceData?.overdue ?? 0) > 0 && (
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)' }}
          >
            {invoiceData.overdue} overdue
          </span>
        )}
      </div>

      <div className="flex-1">
        {!invoiceData || invoiceData.total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
            <CheckCircle2 size={22} className="text-[var(--green)] opacity-60" />
            <p className="text-[11px] text-[var(--text-3)] text-center">No invoice emails found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(invoiceData.invoices ?? []).slice(0, 3).map((inv: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2.5 rounded-lg"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-white truncate">{inv.fromName || inv.fromEmail}</p>
                  {inv.amount && <p className="text-[10px] text-[var(--green)]">{inv.amount}</p>}
                </div>
                {inv.isOverdue && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}
                  >
                    Late
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/dashboard/inbox?filter=all" className="block mt-3 pt-3 border-t border-[var(--border)]">
        <span className="text-[10px] text-[var(--text-3)] hover:text-[var(--green)] transition-colors flex items-center gap-1">
          View inbox <ArrowRight size={9} />
        </span>
      </Link>
    </div>
  )
}
