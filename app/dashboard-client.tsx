'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardData = {
  activeCount: number
  thisWeekCount: number
  currentMonthRevenue: number
  prevMonthRevenue: number
  currentMonthLabel: string
  prevMonthLabel: string
  pendingCount: number
  totalOutstanding: number
  completedThisMonthCount: number
  successRate: number | null
  last4MonthRevenue: Array<{ label: string; value: number }>
  serviceMix: Array<{ label: string; value: number; color: string; pct: number }>
  staffWorkload: Array<{ name: string; count: number; initials: string; pct: number }>
  recentApplications: Array<{ id: string; ref: string; client: string; service: string; status: string | null; date: string | null }>
  recentActivity: Array<{ time: string; text: string; type: 'invoice' | 'task' }>
  allInvoices: Array<{ id: string; ref: string; client: string; service: string; status: string | null; date: string | null; amount: number | null; assignedTo: string | null }>
  statusCounts: Record<string, number>
  last6MonthRevenue: Array<{ label: string; value: number }>
  receiptsByMode: Array<{ mode: string; count: number; total: number }>
  totalBilled: number
  totalCollected: number
  staffDetails: Array<{ name: string; initials: string; openTasks: number; doneTasks: number; totalTasks: number; depts: string[]; color: string }>
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const D = {
  pageBg: 'bg-[#0a0a0a]',
  headerBg: 'bg-[#0a0a0a]',
  headerBorder: 'border-[#1a1a1a]',
  cardBg: 'bg-[#111111]',
  cardBorder: 'border-[#1e1e1e]',
  text: 'text-white',
  textSub: 'text-gray-400',
  textMuted: 'text-gray-600',
  sectionTitle: 'text-gray-500',
  divider: 'divide-[#181818]',
  rowHover: 'hover:bg-[#161616]',
  tabActive: 'bg-[#1a1a1a] text-white',
  tabInactive: 'text-gray-600 hover:text-gray-400',
  progressBg: 'bg-[#1e1e1e]',
  avatarBg: 'bg-[#1c1c1c] text-gray-300',
  input: 'bg-[#111111] border-[#1e1e1e] text-white placeholder-gray-600 focus:border-teal-700',
  clockBg: 'border-[#1e1e1e] text-gray-400',
  brandTextSub: 'text-gray-500',
  brandText: 'text-white',
  themeBtn: 'border-[#1e1e1e] text-gray-400 hover:text-white',
  donutHole: '#111111',
  barGrid: '#1e1e1e',
  barText: '#4b5563',
} as const

const L = {
  pageBg: 'bg-gray-50',
  headerBg: 'bg-white',
  headerBorder: 'border-gray-200',
  cardBg: 'bg-white',
  cardBorder: 'border-gray-200',
  text: 'text-gray-900',
  textSub: 'text-gray-600',
  textMuted: 'text-gray-400',
  sectionTitle: 'text-gray-500',
  divider: 'divide-gray-100',
  rowHover: 'hover:bg-gray-50',
  tabActive: 'bg-gray-100 text-gray-900',
  tabInactive: 'text-gray-500 hover:text-gray-700',
  progressBg: 'bg-gray-100',
  avatarBg: 'bg-gray-100 text-gray-700',
  input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-teal-500',
  clockBg: 'border-gray-200 text-gray-500',
  brandTextSub: 'text-gray-500',
  brandText: 'text-gray-900',
  themeBtn: 'border-gray-200 text-gray-500 hover:text-gray-900',
  donutHole: '#ffffff',
  barGrid: '#e5e7eb',
  barText: '#9ca3af',
} as const

type CS = Record<keyof typeof D, string>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatCompact(n: number) {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(1)}K`
  return `AED ${n.toFixed(0)}`
}

function fmtDate(v: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function statusBadge(status: string | null, isDark: boolean) {
  if (isDark) {
    switch (status) {
      case 'Active':    return 'bg-teal-900/60 text-teal-300 border border-teal-700/40'
      case 'Pending':   return 'bg-blue-900/60 text-blue-300 border border-blue-700/40'
      case 'Completed': return 'bg-green-900/60 text-green-300 border border-green-700/40'
      case 'Partial':   return 'bg-amber-900/60 text-amber-300 border border-amber-700/40'
      case 'Cancelled': return 'bg-gray-800 text-gray-400 border border-gray-700'
      default:          return 'bg-gray-800 text-gray-400 border border-gray-700'
    }
  }
  switch (status) {
    case 'Active':    return 'bg-teal-50 text-teal-700 border border-teal-200'
    case 'Pending':   return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'Completed': return 'bg-green-50 text-green-700 border border-green-200'
    case 'Partial':   return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'Cancelled': return 'bg-gray-100 text-gray-500 border border-gray-200'
    default:          return 'bg-gray-100 text-gray-500 border border-gray-200'
  }
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function DonutChart({
  segments,
  size = 140,
  holeColor,
}: {
  segments: Array<{ label: string; value: number; color: string }>
  size?: number
  holeColor: string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.44
  const innerR = size * 0.27

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={outerR} fill={holeColor === '#111111' ? '#1c1c1c' : '#e5e7eb'} />
        <circle cx={cx} cy={cy} r={innerR} fill={holeColor} />
      </svg>
    )
  }

  const r4 = (n: number) => Math.round(n * 1e4) / 1e4
  let angle = -Math.PI / 2
  const paths: Array<{ d: string; color: string }> = []
  for (const seg of segments) {
    if (seg.value <= 0) continue
    const ratio = seg.value / total
    const end = angle + ratio * 2 * Math.PI
    const la = ratio > 0.5 ? 1 : 0
    const x1 = r4(cx + outerR * Math.cos(angle))
    const y1 = r4(cy + outerR * Math.sin(angle))
    const x2 = r4(cx + outerR * Math.cos(end))
    const y2 = r4(cy + outerR * Math.sin(end))
    const ix1 = r4(cx + innerR * Math.cos(end))
    const iy1 = r4(cy + innerR * Math.sin(end))
    const ix2 = r4(cx + innerR * Math.cos(angle))
    const iy2 = r4(cy + innerR * Math.sin(angle))
    paths.push({
      d: `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${la} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${la} 0 ${ix2} ${iy2} Z`,
      color: seg.color,
    })
    angle = end
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      <circle cx={cx} cy={cy} r={innerR} fill={holeColor} />
    </svg>
  )
}

function BarChart({
  data,
  gridColor,
  textColor,
}: {
  data: Array<{ label: string; value: number }>
  gridColor: string
  textColor: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 280
  const H = 120
  const padX = 6
  const padBottom = 22
  const padTop = 8
  const chartH = H - padBottom - padTop
  const cols = data.length || 1
  const slotW = (W - padX * 2) / cols
  const barW = Math.max(slotW - 8, 4)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <line
          key={i}
          x1={padX}
          y1={padTop + chartH * (1 - f)}
          x2={W - padX}
          y2={padTop + chartH * (1 - f)}
          stroke={gridColor}
          strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * chartH, 2)
        const x = padX + i * slotW + (slotW - barW) / 2
        const y = padTop + chartH - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#0d9488" rx="3" />
            <text x={x + barW / 2} y={H - 5} textAnchor="middle" fill={textColor} fontSize="9">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  subColor,
  barColor,
  barPct,
  cs,
}: {
  title: string
  value: string
  sub: string
  subColor: string
  barColor: string
  barPct: number
  cs: CS
}) {
  return (
    <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
      <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${cs.sectionTitle}`}>{title}</p>
      <p className={`mt-3 text-3xl font-bold tracking-tight ${cs.text}`}>{value}</p>
      <p className={`mt-1 text-xs font-medium ${subColor}`}>{sub}</p>
      <div className={`mt-4 h-[3px] w-full rounded-full ${cs.progressBg}`}>
        <div
          className={`h-[3px] rounded-full ${barColor}`}
          style={{ width: `${Math.min(Math.max(barPct, 4), 100)}%` }}
        />
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ d, isDark, cs }: { d: DashboardData; isDark: boolean; cs: CS }) {
  const growthPct =
    d.prevMonthRevenue > 0
      ? ((d.currentMonthRevenue - d.prevMonthRevenue) / d.prevMonthRevenue) * 100
      : 0

  const totalOpenTasks = d.staffWorkload.reduce((s, x) => s + x.count, 0)

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          cs={cs}
          title="Active Applications"
          value={String(d.activeCount)}
          sub={`+${d.thisWeekCount} this week`}
          subColor="text-green-500"
          barColor="bg-green-500"
          barPct={d.activeCount > 0 ? Math.min((d.activeCount / 30) * 100, 100) : 4}
        />
        <StatCard
          cs={cs}
          title={`Revenue (${d.currentMonthLabel})`}
          value={formatCompact(d.currentMonthRevenue)}
          sub={
            d.prevMonthRevenue > 0
              ? `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% vs ${d.prevMonthLabel}`
              : 'No prior month data'
          }
          subColor={growthPct >= 0 ? 'text-green-500' : 'text-red-500'}
          barColor="bg-amber-400"
          barPct={55}
        />
        <StatCard
          cs={cs}
          title="Pending Payments"
          value={String(d.pendingCount)}
          sub={`${formatCompact(d.totalOutstanding)} outstanding`}
          subColor="text-red-500"
          barColor="bg-red-500"
          barPct={d.pendingCount > 0 ? Math.min((d.pendingCount / 20) * 100, 100) : 4}
        />
        <StatCard
          cs={cs}
          title={`Completed (${d.currentMonthLabel})`}
          value={String(d.completedThisMonthCount)}
          sub={d.successRate != null ? `${d.successRate.toFixed(1)}% success rate` : 'No data yet'}
          subColor="text-blue-500"
          barColor="bg-blue-500"
          barPct={d.successRate ?? 0}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`lg:col-span-2 rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
              Recent Applications
            </h2>
            <Link href="/invoices" className="text-xs font-medium text-teal-500 hover:text-teal-400">
              VIEW ALL ↗
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${cs.cardBorder} text-[10px] uppercase tracking-[0.14em] ${cs.textMuted}`}>
                <th className="pb-3 text-left font-medium">Ref</th>
                <th className="pb-3 text-left font-medium">Client</th>
                <th className="pb-3 text-left font-medium hidden md:table-cell">Notes</th>
                <th className="pb-3 text-left font-medium">Status</th>
                <th className="pb-3 text-left font-medium hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className={cs.divider}>
              {d.recentApplications.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-8 text-center text-sm ${cs.textMuted}`}>
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                d.recentApplications.map((app) => (
                  <tr key={app.id} className={`transition ${cs.rowHover}`}>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/invoices/${app.id}`}
                        className="font-mono text-sm text-teal-500 hover:text-teal-400"
                      >
                        #{app.ref}
                      </Link>
                    </td>
                    <td className={`py-3 pr-4 text-sm ${cs.text}`}>{app.client}</td>
                    <td className={`py-3 pr-4 text-sm ${cs.textSub} hidden md:table-cell`}>
                      {app.service}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusBadge(app.status, isDark)}`}
                      >
                        {app.status ?? 'Unknown'}
                      </span>
                    </td>
                    <td className={`py-3 text-sm ${cs.textSub} hidden sm:table-cell`}>
                      {fmtDate(app.date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <h2 className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Service Mix ({d.currentMonthLabel})
          </h2>
          <div className="flex justify-center">
            <DonutChart segments={d.serviceMix} size={148} holeColor={cs.donutHole} />
          </div>
          <div className="mt-5 space-y-2.5">
            {d.serviceMix.length === 0 ? (
              <p className={`text-center text-xs ${cs.textMuted}`}>No task data yet.</p>
            ) : (
              d.serviceMix.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className={`flex-1 truncate ${cs.textSub}`}>{s.label}</span>
                  <span className={`shrink-0 ${cs.textMuted}`}>— {s.pct}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <h2 className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Staff Workload
          </h2>
          <div className="space-y-4">
            {d.staffWorkload.length === 0 ? (
              <p className={`text-xs ${cs.textMuted}`}>No open tasks.</p>
            ) : (
              d.staffWorkload.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${cs.avatarBg}`}
                  >
                    {s.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${cs.text}`}>{s.name}</span>
                      <span className={`shrink-0 text-xs ${cs.textMuted}`}>{s.count} tasks</span>
                    </div>
                    <div className={`mt-1.5 h-1.5 w-full rounded-full ${cs.progressBg}`}>
                      <div
                        className="h-1.5 rounded-full bg-teal-600"
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <h2 className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Monthly Revenue
          </h2>
          <p className={`mb-4 text-2xl font-bold ${cs.text}`}>
            {formatCompact(d.currentMonthRevenue)}
          </p>
          <BarChart data={d.last4MonthRevenue} gridColor={cs.barGrid} textColor={cs.barText} />
        </div>

        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <h2 className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Recent Activity
          </h2>
          <div className="space-y-4">
            {d.recentActivity.length === 0 ? (
              <p className={`text-xs ${cs.textMuted}`}>No activity yet.</p>
            ) : (
              d.recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.type === 'invoice' ? 'bg-teal-400' : 'bg-blue-400'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs ${cs.textSub}`}>{a.text}</p>
                    <p className={`mt-0.5 text-[10px] tabular-nums ${cs.textMuted}`}>{a.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/invoices"
          className={`flex items-center justify-between rounded-xl border ${cs.cardBorder} ${cs.cardBg} px-5 py-4 transition hover:border-amber-500/30`}
        >
          <div>
            <p className={`text-[10px] uppercase tracking-[0.15em] ${cs.textMuted}`}>
              Pending Collections
            </p>
            <p className={`mt-1 text-lg font-bold ${cs.text}`}>{d.pendingCount} invoices</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-amber-400">{formatCompact(d.totalOutstanding)}</p>
            <p className={`text-xs ${cs.textMuted}`}>outstanding →</p>
          </div>
        </Link>
        <Link
          href="/daily-works"
          className={`flex items-center justify-between rounded-xl border ${cs.cardBorder} ${cs.cardBg} px-5 py-4 transition hover:border-teal-500/30`}
        >
          <div>
            <p className={`text-[10px] uppercase tracking-[0.15em] ${cs.textMuted}`}>Open Tasks</p>
            <p className={`mt-1 text-lg font-bold ${cs.text}`}>{totalOpenTasks} tasks</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-teal-400">Daily Works</p>
            <p className={`text-xs ${cs.textMuted}`}>view worksheet →</p>
          </div>
        </Link>
      </div>
    </>
  )
}

// ─── Applications Tab ─────────────────────────────────────────────────────────

function ApplicationsTab({ d, isDark, cs }: { d: DashboardData; isDark: boolean; cs: CS }) {
  const [filter, setFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const STATUSES = ['Active', 'Pending', 'Partial', 'Completed', 'Cancelled']

  const filtered = d.allInvoices.filter((inv) => {
    if (filter && inv.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        inv.ref.toLowerCase().includes(q) ||
        inv.client.toLowerCase().includes(q) ||
        (inv.service ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? null : s)}
            className={`rounded-xl border p-3 text-left transition ${
              filter === s
                ? `${cs.cardBorder} bg-teal-600/20 border-teal-700/50`
                : `${cs.cardBorder} ${cs.cardBg}`
            }`}
          >
            <p className={`text-xs font-medium ${filter === s ? 'text-teal-400' : cs.textSub}`}>
              {s}
            </p>
            <p className={`mt-1 text-xl font-bold ${filter === s ? 'text-teal-300' : cs.text}`}>
              {d.statusCounts[s] ?? 0}
            </p>
          </button>
        ))}
      </div>

      <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
        <div className="mb-4 flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by ref, client, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none ${cs.input}`}
          />
          {(filter || search) && (
            <button
              onClick={() => { setFilter(null); setSearch('') }}
              className={`text-xs ${cs.textSub} hover:text-red-400`}
            >
              Clear
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`border-b ${cs.cardBorder} text-[10px] uppercase tracking-[0.14em] ${cs.textMuted}`}
              >
                <th className="pb-3 text-left font-medium">Ref</th>
                <th className="pb-3 text-left font-medium">Client</th>
                <th className="pb-3 text-left font-medium hidden md:table-cell">Notes</th>
                <th className="pb-3 text-left font-medium">Status</th>
                <th className="pb-3 text-right font-medium hidden sm:table-cell">Amount</th>
                <th className="pb-3 text-left font-medium hidden lg:table-cell">Assigned</th>
                <th className="pb-3 text-left font-medium hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className={cs.divider}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`py-8 text-center text-sm ${cs.textMuted}`}>
                    No invoices match.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className={`transition ${cs.rowHover}`}>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono text-sm text-teal-500 hover:text-teal-400"
                      >
                        #{inv.ref}
                      </Link>
                    </td>
                    <td className={`py-3 pr-4 text-sm ${cs.text}`}>{inv.client}</td>
                    <td
                      className={`py-3 pr-4 text-sm ${cs.textSub} hidden md:table-cell max-w-[180px] truncate`}
                    >
                      {inv.service || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusBadge(inv.status, isDark)}`}
                      >
                        {inv.status ?? 'Unknown'}
                      </span>
                    </td>
                    <td className={`py-3 pr-4 text-sm text-right ${cs.text} hidden sm:table-cell`}>
                      {inv.amount != null ? `AED ${inv.amount.toLocaleString()}` : '—'}
                    </td>
                    <td className={`py-3 pr-4 text-sm ${cs.textSub} hidden lg:table-cell`}>
                      {inv.assignedTo ?? '—'}
                    </td>
                    <td className={`py-3 text-sm ${cs.textSub} hidden sm:table-cell`}>
                      {fmtDate(inv.date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={`mt-3 text-xs ${cs.textMuted}`}>
          {filtered.length} of {d.allInvoices.length} invoices
        </p>
      </div>
    </div>
  )
}

// ─── Finance Tab ──────────────────────────────────────────────────────────────

function FinanceTab({ d, cs }: { d: DashboardData; cs: CS }) {
  const collectionRate =
    d.totalBilled > 0 ? (d.totalCollected / d.totalBilled) * 100 : 0
  const outstanding = Math.max(d.totalBilled - d.totalCollected, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Total Billed
          </p>
          <p className={`mt-3 text-2xl font-bold ${cs.text}`}>{formatCompact(d.totalBilled)}</p>
          <p className={`mt-1 text-xs ${cs.textSub}`}>All non-cancelled invoices</p>
        </div>
        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Collected
          </p>
          <p className="mt-3 text-2xl font-bold text-green-500">{formatCompact(d.totalCollected)}</p>
          <p className={`mt-1 text-xs ${cs.textSub}`}>{collectionRate.toFixed(1)}% collection rate</p>
        </div>
        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Outstanding
          </p>
          <p className="mt-3 text-2xl font-bold text-red-500">{formatCompact(outstanding)}</p>
          <p className={`mt-1 text-xs ${cs.textSub}`}>Uncollected balance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <h2 className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Revenue — Last 6 Months
          </h2>
          <BarChart data={d.last6MonthRevenue} gridColor={cs.barGrid} textColor={cs.barText} />
        </div>

        <div className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
          <h2 className={`mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] ${cs.sectionTitle}`}>
            Payment Methods
          </h2>
          {d.receiptsByMode.length === 0 ? (
            <p className={`text-xs ${cs.textMuted}`}>No receipts recorded.</p>
          ) : (
            <div className="space-y-4">
              {d.receiptsByMode.map((m, i) => {
                const maxTotal = Math.max(...d.receiptsByMode.map((x) => x.total), 1)
                const COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#f97316']
                return (
                  <div key={m.mode}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${cs.text}`}>{m.mode}</span>
                      <span className={`text-sm font-medium ${cs.text}`}>
                        {formatCompact(m.total)}
                      </span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full ${cs.progressBg}`}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(m.total / maxTotal) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <p className={`mt-0.5 text-[10px] ${cs.textMuted}`}>{m.count} transactions</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Staff Tab ────────────────────────────────────────────────────────────────

function StaffTab({ d, cs }: { d: DashboardData; cs: CS }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {d.staffDetails.length === 0 ? (
        <p className={`text-sm ${cs.textMuted}`}>No staff task data.</p>
      ) : (
        d.staffDetails.map((s) => (
          <div key={s.name} className={`rounded-xl border ${cs.cardBorder} ${cs.cardBg} p-5`}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: s.color }}
              >
                {s.initials}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${cs.text}`}>{s.name}</p>
                <p className={`text-xs truncate ${cs.textSub}`}>
                  {s.depts.length > 0 ? s.depts.join(', ') : 'No dept'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className={`text-xl font-bold ${cs.text}`}>{s.totalTasks}</p>
                <p className={`text-[10px] uppercase tracking-[0.1em] ${cs.textMuted}`}>Total</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-400">{s.openTasks}</p>
                <p className={`text-[10px] uppercase tracking-[0.1em] ${cs.textMuted}`}>Open</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-500">{s.doneTasks}</p>
                <p className={`text-[10px] uppercase tracking-[0.1em] ${cs.textMuted}`}>Done</p>
              </div>
            </div>
            {s.totalTasks > 0 && (
              <div className={`mt-4 h-1.5 w-full rounded-full ${cs.progressBg}`}>
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${(s.doneTasks / s.totalTasks) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ['Overview', 'Applications', 'Finance', 'Staff'] as const
type Tab = (typeof TABS)[number]

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<Tab>('Overview')
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ops-theme')
      if (saved === 'light') setIsDark(false)
    } catch {}
  }, [])

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev
      try {
        localStorage.setItem('ops-theme', next ? 'dark' : 'light')
      } catch {}
      return next
    })
  }

  const cs = isDark ? D : L

  return (
    <div className={`min-h-screen ${cs.pageBg}`}>
      <header className={`border-b ${cs.headerBorder} ${cs.headerBg} px-6 py-4`}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-black">
              AW
            </div>
            <div>
              <p className={`text-[10px] font-medium uppercase tracking-[0.2em] ${cs.brandTextSub}`}>
                Alwahaa Document Clearing
              </p>
              <p className={`text-xs font-bold uppercase tracking-[0.15em] ${cs.brandText}`}>
                Operations Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`rounded-full border px-3 py-1.5 text-[11px] transition ${cs.themeBtn}`}
            >
              {isDark ? '☀ Light' : '☾ Dark'}
            </button>
            <div className={`rounded-full border px-3 py-1.5 text-[11px] tabular-nums ${cs.clockBg}`}>
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <nav className="mb-6 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t ? cs.tabActive : cs.tabInactive
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === 'Overview' && <OverviewTab d={data} isDark={isDark} cs={cs} />}
        {tab === 'Applications' && <ApplicationsTab d={data} isDark={isDark} cs={cs} />}
        {tab === 'Finance' && <FinanceTab d={data} cs={cs} />}
        {tab === 'Staff' && <StaffTab d={data} cs={cs} />}
      </div>
    </div>
  )
}
