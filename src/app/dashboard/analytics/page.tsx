'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Clock, MailOpen, CheckCircle, Users } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  avgResponseTimeMinutes: number
  avgResponseTimeTrend: number        // % change vs prev period
  emailsPerDay7d: number
  emailsPerDayTrend: number
  inboxZeroDays: number
  replyRate: number                   // 0-1
  replyRateTrend: number
  productivityScore: number           // 0-100
  dailyVolume: { date: string; received: number; sent: number }[]
  topSenders: { email: string; name: string; count: number; percent: number }[]
  responseTimeSeries: { hour: number; avgMinutes: number }[]
  heatmap: { day: number; hour: number; count: number }[]
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch('/api/analytics')
  if (!res.ok) throw new Error('Failed to load analytics')
  return res.json()
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number
  trendLabel?: string
  color: string
}) {
  const positive = trend !== undefined && trend >= 0
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: color + '20', color }}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <div
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={
              positive
                ? { background: 'var(--green-subtle)', color: 'var(--green)' }
                : { background: 'var(--red-subtle)', color: 'var(--red)' }
            }
          >
            {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--text-1)' }}>
          {value}
        </p>
        <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
          {label}
          {trendLabel && (
            <span className="ml-1" style={{ color: 'var(--text-3)' }}>
              {trendLabel}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function BarChart({ data }: { data: { date: string; received: number; sent: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.received, d.sent]), 1)
  return (
    <div className="flex items-end gap-1.5 h-32 w-full pt-2">
      {data.map((d) => {
        const recvH = Math.round((d.received / max) * 100)
        const sentH = Math.round((d.sent / max) * 100)
        const label = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-0.5 w-full" style={{ height: '100%' }}>
              <div
                className="flex-1 rounded-t-sm transition-all duration-500"
                style={{ height: `${recvH}%`, minHeight: 2, background: 'var(--accent)', opacity: 0.7 }}
                title={`Received: ${d.received}`}
              />
              <div
                className="flex-1 rounded-t-sm transition-all duration-500"
                style={{ height: `${sentH}%`, minHeight: 2, background: 'var(--green)' }}
                title={`Sent: ${d.sent}`}
              />
            </div>
            <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ProductivityRing({ score }: { score: number }) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const filled = (score / 100) * circumference
  const color =
    score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--accent)'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold" style={{ color: 'var(--text-1)' }}>
            {score}
          </span>
          <span
            className="text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-3)' }}
          >
            Score
          </span>
        </div>
      </div>
      <p className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>
        Productivity Score
      </p>
    </div>
  )
}

function ResponseTimeLine({ data }: { data: { hour: number; avgMinutes: number }[] }) {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.avgMinutes), 60)
  const W = 240
  const H = 80
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - (d.avgMinutes / max) * H
    return `${x},${y}`
  })
  const path = `M ${pts.join(' L ')}`
  const fill = `M ${pts[0]} L ${pts.join(' L ')} L ${W},${H} L 0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80, overflow: 'visible' }}>
      <defs>
        <linearGradient id="rtGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#rtGradient)" />
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Heatmap({ data }: { data: { day: number; hour: number; count: number }[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const max = Math.max(...data.map((d) => d.count), 1)
  const map = new Map(data.map((d) => [`${d.day}-${d.hour}`, d.count]))
  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2 }}>
        <div />
        {hours.map((h) => (
          <div
            key={h}
            className="text-center"
            style={{ fontSize: 8, color: 'var(--text-3)', paddingBottom: 2 }}
          >
            {h % 4 === 0 ? `${h}h` : ''}
          </div>
        ))}
        {days.map((day, di) => (
          <>
            <div
              key={`day-${di}`}
              className="text-right pr-1 flex items-center justify-end"
              style={{ fontSize: 9, color: 'var(--text-3)' }}
            >
              {day}
            </div>
            {hours.map((h) => {
              const count = map.get(`${di}-${h}`) ?? 0
              const opacity = count / max
              return (
                <div
                  key={`${di}-${h}`}
                  title={`${day} ${h}:00 — ${count} emails`}
                  style={{
                    height: 10,
                    borderRadius: 2,
                    background:
                      count > 0
                        ? `rgba(242,78,30,${0.15 + opacity * 0.75})`
                        : 'var(--bg-hover)',
                  }}
                />
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton rounded-2xl h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="skeleton rounded-2xl h-64 lg:col-span-2" />
        <div className="skeleton rounded-2xl h-64" />
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
    staleTime: 5 * 60_000,
  })

  const fmtMinutes = (m: number) =>
    m < 60 ? `${Math.round(m)}m` : `${(m / 60).toFixed(1)}h`

  const topSendersMax = useMemo(
    () => Math.max(...(data?.topSenders.map((s) => s.count) ?? [1])),
    [data]
  )

  if (isLoading) return <AnalyticsSkeleton />
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[14px]" style={{ color: 'var(--text-3)' }}>
          Could not load analytics. Try refreshing.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-1)' }}>
          Analytics
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          Last 7 days · updates every 5 minutes
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Clock size={16} />}
          label="Avg response time"
          value={fmtMinutes(data.avgResponseTimeMinutes)}
          trend={data.avgResponseTimeTrend}
          trendLabel="vs last week"
          color="var(--accent)"
        />
        <MetricCard
          icon={<MailOpen size={16} />}
          label="Emails per day"
          value={String(data.emailsPerDay7d)}
          trend={data.emailsPerDayTrend}
          trendLabel="vs last week"
          color="var(--blue)"
        />
        <MetricCard
          icon={<CheckCircle size={16} />}
          label="Inbox zero days"
          value={String(data.inboxZeroDays)}
          color="var(--green)"
        />
        <MetricCard
          icon={<Users size={16} />}
          label="Reply rate"
          value={`${Math.round(data.replyRate * 100)}%`}
          trend={data.replyRateTrend}
          trendLabel="vs last week"
          color="var(--amber)"
        />
      </div>

      {/* Volume chart + Productivity ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
              Email Volume
            </h2>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ background: 'var(--accent)', opacity: 0.7 }}
                />
                Received
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ background: 'var(--green)' }}
                />
                Sent
              </span>
            </div>
          </div>
          <BarChart data={data.dailyVolume} />
        </div>

        <div
          className="rounded-2xl p-5 flex flex-col items-center justify-center gap-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <ProductivityRing score={data.productivityScore} />
          <div className="w-full space-y-2">
            {[
              {
                label: 'Response speed',
                val: Math.min(100, Math.round(100 - data.avgResponseTimeMinutes / 4)),
              },
              { label: 'Reply rate', val: Math.round(data.replyRate * 100) },
              { label: 'Inbox control', val: Math.min(100, data.inboxZeroDays * 14) },
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span style={{ color: 'var(--text-2)' }}>{label}</span>
                  <span style={{ color: 'var(--text-3)' }}>{val}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${val}%`, background: 'var(--accent)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Response time trend + Top senders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
            Response Time Trend (24h)
          </h2>
          <ResponseTimeLine data={data.responseTimeSeries} />
          <div
            className="flex justify-between mt-2 text-[10px]"
            style={{ color: 'var(--text-3)' }}
          >
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>12am</span>
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
            Top Senders
          </h2>
          <div className="space-y-2.5">
            {data.topSenders.slice(0, 6).map((s) => (
              <div key={s.email} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[12px] mb-0.5">
                    <span
                      className="truncate font-medium"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {s.name}
                    </span>
                    <span
                      className="shrink-0 ml-2 tabular-nums"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {s.count}
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-hover)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.count / topSendersMax) * 100}%`,
                        background: 'var(--accent)',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
          Email Activity Heatmap
        </h2>
        <Heatmap data={data.heatmap} />
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            Less
          </span>
          {[0.15, 0.35, 0.55, 0.75, 0.9].map((o) => (
            <div
              key={o}
              className="w-3 h-3 rounded-sm"
              style={{ background: `rgba(242,78,30,${o})` }}
            />
          ))}
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            More
          </span>
        </div>
      </div>
    </div>
  )
}
