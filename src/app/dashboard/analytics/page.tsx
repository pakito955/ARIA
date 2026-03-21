'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Sparkline SVG component
function Sparkline({ data, color = '#e8c97a' }: { data: number[]; color?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const h = 36

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fill = `${path} L ${w} ${h} L 0 ${h} Z`

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Donut chart
function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const r = 40
  const cx = 50
  const cy = 50
  let offset = 0

  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * 2 * Math.PI * r
        const gap = 2 * Math.PI * r - dash

        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="12"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        )
        offset += dash + 2
        return el
      })}
      <circle cx={cx} cy={cy} r={28} fill="#0d0d1a" />
    </svg>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics')
      if (!res.ok) {
        // Return mock data if endpoint not ready
        return {
          emailsThisWeek: 47,
          timeSaved: 3.2,
          responseRate: 94,
          aiActions: 128,
          weeklyVolume: [12, 8, 15, 7, 18, 9, 14],
          categories: [
            { label: 'Task', value: 38, color: '#86efac' },
            { label: 'Meeting', value: 22, color: '#f4a0b5' },
            { label: 'Info', value: 28, color: '#7eb8f7' },
            { label: 'Spam', value: 12, color: '#5a5a78' },
          ],
        }
      }
      return res.json()
    },
  })

  const topStats = [
    { label: 'Emailova obrađeno', value: data?.emailsThisWeek ?? '—', unit: 'ove sedmice', color: '#e8c97a' },
    { label: 'Uštječeno vremena', value: data?.timeSaved ? `${data.timeSaved}h` : '—', unit: 'ove sedmice', color: '#4fd1c5' },
    { label: 'Response rate', value: data?.responseRate ? `${data.responseRate}%` : '—', unit: 'avg', color: '#86efac' },
    { label: 'AI akcija', value: data?.aiActions ?? '—', unit: 'ukupno', color: '#7eb8f7' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/[0.055]">
        <h1 className="font-cormorant text-3xl font-light">Analitika</h1>
        <p className="text-[11px] text-[#8888aa] mt-0.5">Pregled produktivnosti i AI aktivnosti</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3">
          {topStats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#0d0d1a] border border-white/[0.055] rounded p-4"
            >
              <p className="font-cormorant text-4xl font-light" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-[11px] text-white mt-1">{s.label}</p>
              <p className="text-[9px] text-[#5a5a78] mt-0.5">{s.unit}</p>
            </motion.div>
          ))}
        </div>

        {/* Weekly volume chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0d0d1a] border border-white/[0.055] rounded p-4"
        >
          <p className="text-[8px] tracking-[2px] uppercase text-[#8888aa] mb-4">
            Email volumen · Ova sedmica
          </p>
          <div className="flex items-end gap-2">
            {(data?.weeklyVolume || [12, 8, 15, 7, 18, 9, 14]).map((v: number, i: number) => {
              const max = Math.max(...(data?.weeklyVolume || [18]))
              const days = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(v / max) * 80}px` }}
                    transition={{ delay: 0.3 + i * 0.06, ease: 'easeOut' }}
                    className="w-full rounded-sm"
                    style={{
                      background: i === new Date().getDay() - 1
                        ? 'rgba(232,201,122,0.6)'
                        : 'rgba(255,255,255,0.08)',
                    }}
                  />
                  <span className="text-[9px] text-[#5a5a78]">{days[i]}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Category breakdown */}
        {data?.categories && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0d0d1a] border border-white/[0.055] rounded p-4"
          >
            <p className="text-[8px] tracking-[2px] uppercase text-[#8888aa] mb-4">
              Distribucija po kategorijama
            </p>
            <div className="flex items-center gap-5">
              <DonutChart segments={data.categories} />
              <div className="space-y-2">
                {data.categories.map((c: any) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-[11px] text-[#8888aa]">{c.label}</span>
                    <span className="text-[11px] text-white ml-auto font-mono">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ROI Calculator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-[#e8c97a]/[0.07] to-[#e8c97a]/[0.03] border border-[#e8c97a]/15 rounded p-4"
        >
          <p className="text-[8px] tracking-[2px] uppercase text-[#e8c97a] mb-3">ROI Kalkulator</p>
          <div className="space-y-2">
            <RoiRow label="ARIA cijena (Pro)" value="€29/mj" />
            <RoiRow
              label="Uštečeno vremena"
              value={`${data?.timeSaved ?? 3.2}h/sedmici`}
            />
            <RoiRow
              label="Vrijednost (€50/h)"
              value={`€${((data?.timeSaved ?? 3.2) * 4 * 50).toFixed(0)}/mj`}
              highlight
            />
            <div className="border-t border-[#e8c97a]/10 pt-2 mt-2">
              <RoiRow
                label="Neto dobit"
                value={`€${((data?.timeSaved ?? 3.2) * 4 * 50 - 29).toFixed(0)}/mj`}
                highlight
                big
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function RoiRow({ label, value, highlight, big }: any) {
  return (
    <div className={cn('flex justify-between', big && 'mt-1')}>
      <span className={cn('text-[11px] text-[#8888aa]', big && 'text-[12px] text-white')}>{label}</span>
      <span className={cn(
        'text-[11px] font-mono',
        highlight ? 'text-[#e8c97a]' : 'text-white',
        big && 'text-[13px] font-semibold'
      )}>
        {value}
      </span>
    </div>
  )
}
