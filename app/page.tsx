import Link from 'next/link'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { selectAllInvoiceTasks, type InvoiceTaskRecord } from '@/lib/invoice-tasks'
import { getClientNameMap, getInvoices } from '@/lib/invoices'
import OpsDashboardClock from '@/components/ops-dashboard-clock'

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceReceiptRow = {
  id: string
  invoice_id: string
  amount: number | null
  date: string | null
  created_at: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CHART_COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#f97316', '#6b7280']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `AED ${(amount / 1_000).toFixed(1)}K`
  return `AED ${amount.toFixed(0)}`
}

function formatDateShort(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function getLastNMonths(n: number): Array<{ key: string; label: string }> {
  const result: Array<{ key: string; label: string }> = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    result.push({ key, label: MONTH_NAMES[d.getMonth()] })
  }
  return result
}

function isOpenTask(status: string | null) {
  return (status ?? 'Pending') !== 'Done'
}

function getStatusClasses(status: string | null) {
  switch (status) {
    case 'Active':    return 'bg-teal-900/60 text-teal-300 border border-teal-700/40'
    case 'Pending':   return 'bg-blue-900/60 text-blue-300 border border-blue-700/40'
    case 'Completed': return 'bg-green-900/60 text-green-300 border border-green-700/40'
    case 'Partial':   return 'bg-amber-900/60 text-amber-300 border border-amber-700/40'
    case 'Cancelled': return 'bg-gray-800 text-gray-400 border border-gray-700'
    default:          return 'bg-gray-800 text-gray-400 border border-gray-700'
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  subColor,
  barColor,
  barPct,
}: {
  title: string
  value: string
  sub: string
  subColor: string
  barColor: string
  barPct: number
}) {
  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#111111] p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className={`mt-1 text-xs font-medium ${subColor}`}>{sub}</p>
      <div className="mt-4 h-[3px] w-full rounded-full bg-[#1f1f1f]">
        <div className={`h-[3px] rounded-full ${barColor}`} style={{ width: `${Math.min(Math.max(barPct, 4), 100)}%` }} />
      </div>
    </div>
  )
}

function DonutChart({ segments, size = 140 }: {
  segments: Array<{ label: string; value: number; color: string }>
  size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={size * 0.44} fill="#1c1c1c" />
        <circle cx={size / 2} cy={size / 2} r={size * 0.27} fill="#111111" />
      </svg>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.44
  const innerR = size * 0.27
  const paths: Array<{ d: string; color: string }> = []
  let angle = -Math.PI / 2

  for (const seg of segments) {
    if (seg.value <= 0) continue
    const ratio = seg.value / total
    const startAngle = angle
    const endAngle = angle + ratio * 2 * Math.PI
    angle = endAngle

    const largeArc = ratio > 0.5 ? 1 : 0
    const x1 = cx + outerR * Math.cos(startAngle)
    const y1 = cy + outerR * Math.sin(startAngle)
    const x2 = cx + outerR * Math.cos(endAngle)
    const y2 = cy + outerR * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)

    paths.push({
      d: `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`,
      color: seg.color,
    })
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      <circle cx={cx} cy={cy} r={innerR} fill="#111111" />
    </svg>
  )
}

function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
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
      {[0.25, 0.5, 0.75, 1].map((frac, i) => {
        const y = padTop + chartH * (1 - frac)
        return <line key={i} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#1e1e1e" strokeWidth="1" />
      })}
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * chartH, 2)
        const x = padX + i * slotW + (slotW - barW) / 2
        const y = padTop + chartH - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#0d9488" rx="3" />
            <text x={x + barW / 2} y={H - 5} textAnchor="middle" fill="#4b5563" fontSize="9">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const { db } = await requireAuthenticatedAppUser()

  const [invoices, clientNames, tasksResult, receiptsResult] = await Promise.all([
    getInvoices(db),
    getClientNameMap(db),
    selectAllInvoiceTasks(db),
    db
      .from('invoice_receipts')
      .select('id, invoice_id, amount, date, created_at')
      .order('created_at', { ascending: false }),
  ])

  const tasks = (tasksResult.data ?? []) as InvoiceTaskRecord[]
  const receipts = (receiptsResult.data ?? []) as InvoiceReceiptRow[]

  // ── Date context ──
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
  const oneWeekAgoStr = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10)
  const currentMonthLabel = MONTH_NAMES[now.getMonth()].toUpperCase()

  // ── Receipt totals per invoice ──
  const receiptTotals = new Map<string, number>()
  for (const r of receipts) {
    receiptTotals.set(r.invoice_id, (receiptTotals.get(r.invoice_id) ?? 0) + (r.amount ?? 0))
  }

  // ── Stat 1: Active applications ──
  const activeInvoices = invoices.filter((i) =>
    ['Active', 'Pending', 'Partial'].includes(i.status ?? '')
  )
  const thisWeekCount = invoices.filter((i) => (i.created_at ?? '') >= oneWeekAgoStr).length

  // ── Stat 2: Revenue this month ──
  const currentMonthRevenue = invoices
    .filter((i) => (i.date ?? '').startsWith(currentMonthKey) && i.status !== 'Cancelled')
    .reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const prevMonthRevenue = invoices
    .filter((i) => (i.date ?? '').startsWith(prevMonthKey) && i.status !== 'Cancelled')
    .reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const revenueGrowthPct =
    prevMonthRevenue > 0
      ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : 0

  // ── Stat 3: Pending payments ──
  const pendingItems = invoices
    .filter((i) => i.status !== 'Cancelled')
    .map((i) => {
      const paid = receiptTotals.get(i.id) ?? 0
      return { invoice: i, outstanding: Math.max((i.total_amount ?? 0) - paid, 0) }
    })
    .filter((x) => x.outstanding > 0)
  const totalOutstanding = pendingItems.reduce((s, x) => s + x.outstanding, 0)

  // ── Stat 4: Completed this month ──
  const completedThisMonth = invoices.filter(
    (i) => i.status === 'Completed' && (i.date ?? '').startsWith(currentMonthKey)
  )
  const cancelledThisMonth = invoices.filter(
    (i) => i.status === 'Cancelled' && (i.date ?? '').startsWith(currentMonthKey)
  )
  const finishedTotal = completedThisMonth.length + cancelledThisMonth.length
  const successRate =
    finishedTotal > 0 ? ((completedThisMonth.length / finishedTotal) * 100).toFixed(1) : null

  // ── Monthly revenue (last 4 months) ──
  const last4Months = getLastNMonths(4)
  const monthlyRevenueData = last4Months.map(({ key, label }) => ({
    label,
    value: invoices
      .filter((i) => (i.date ?? '').startsWith(key) && i.status !== 'Cancelled')
      .reduce((s, i) => s + (i.total_amount ?? 0), 0),
  }))

  // ── Service mix (by dept) ──
  const deptCount = new Map<string, number>()
  for (const t of tasks) {
    const dept = t.dept?.trim() || 'Other'
    deptCount.set(dept, (deptCount.get(dept) ?? 0) + 1)
  }
  const totalTaskCount = tasks.length || 1
  const serviceMix = [...deptCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i],
      pct: Math.round((value / totalTaskCount) * 100),
    }))

  // ── Staff workload ──
  const openTasks = tasks.filter((t) => isOpenTask(t.status))
  const workloadMap = new Map<string, number>()
  for (const t of openTasks) {
    const name = t.assigned_to?.trim() || 'Unassigned'
    workloadMap.set(name, (workloadMap.get(name) ?? 0) + 1)
  }
  const maxWorkload = Math.max(...workloadMap.values(), 1)
  const staffWorkload = [...workloadMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      initials: name
        .split(' ')
        .map((n) => n[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      pct: Math.round((count / maxWorkload) * 100),
    }))

  // ── Recent applications ──
  const recentApplications = invoices.slice(0, 5).map((i) => ({
    id: i.id,
    ref: i.invoice_no,
    client: i.client_id ? (clientNames.get(i.client_id) ?? 'Unknown') : 'Unknown',
    service: i.notes?.slice(0, 38) ?? '—',
    status: i.status,
    date: i.date,
  }))

  // ── Recent activity ──
  type ActivityItem = { time: string; text: string; dotColor: string }
  const recentActivity: ActivityItem[] = [
    ...invoices.slice(0, 4).map((i) => ({
      time: i.created_at?.slice(11, 16) ?? '',
      text: `Invoice #${i.invoice_no} — ${i.client_id ? (clientNames.get(i.client_id) ?? '') : ''}`,
      dotColor: 'bg-teal-400',
    })),
    ...tasks.slice(0, 4).map((t) => ({
      time: t.created_at?.slice(11, 16) ?? '',
      text: `Task: ${(t.particulars ?? 'Untitled').slice(0, 40)}`,
      dotColor: 'bg-blue-400',
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header ── */}
      <header className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-black">
              AW
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
                Alwahaa Document Clearing
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white">
                Operations Dashboard
              </p>
            </div>
          </div>
          <div className="rounded-full border border-[#1e1e1e] px-3 py-1.5 text-[11px] text-gray-400 tabular-nums">
            <OpsDashboardClock />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* ── Tabs ── */}
        <nav className="mb-6 flex gap-1">
          {['Overview', 'Applications', 'Finance', 'Staff'].map((tab, i) => (
            <span
              key={tab}
              className={`cursor-default rounded-lg px-4 py-2 text-sm font-medium ${
                i === 0
                  ? 'bg-[#1a1a1a] text-white'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {tab}
            </span>
          ))}
        </nav>

        {/* ── Stat cards ── */}
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Active Applications"
            value={String(activeInvoices.length)}
            sub={`+${thisWeekCount} this week`}
            subColor="text-green-400"
            barColor="bg-green-500"
            barPct={invoices.length > 0 ? (activeInvoices.length / invoices.length) * 100 : 0}
          />
          <StatCard
            title={`Revenue (${currentMonthLabel})`}
            value={formatCompact(currentMonthRevenue)}
            sub={
              prevMonthRevenue > 0
                ? `${revenueGrowthPct >= 0 ? '+' : ''}${revenueGrowthPct.toFixed(1)}% vs ${MONTH_NAMES[prevMonthDate.getMonth()]}`
                : 'No prior month data'
            }
            subColor={revenueGrowthPct >= 0 ? 'text-green-400' : 'text-red-400'}
            barColor="bg-amber-400"
            barPct={55}
          />
          <StatCard
            title="Pending Payments"
            value={String(pendingItems.length)}
            sub={`${formatCompact(totalOutstanding)} outstanding`}
            subColor="text-red-400"
            barColor="bg-red-500"
            barPct={invoices.length > 0 ? (pendingItems.length / invoices.length) * 100 : 0}
          />
          <StatCard
            title={`Completed (${currentMonthLabel})`}
            value={String(completedThisMonth.length)}
            sub={successRate ? `${successRate}% success rate` : 'No data yet'}
            subColor="text-blue-400"
            barColor="bg-blue-500"
            barPct={successRate ? parseFloat(successRate) : 0}
          />
        </div>

        {/* ── Main grid: Recent Applications + Service Mix ── */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent Applications */}
          <div className="lg:col-span-2 rounded-xl border border-[#1e1e1e] bg-[#111111] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Recent Applications
              </h2>
              <Link href="/invoices" className="text-xs font-medium text-teal-400 hover:text-teal-300">
                VIEW ALL ↗
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e] text-[10px] uppercase tracking-[0.14em] text-gray-600">
                  <th className="pb-3 text-left font-medium">Ref</th>
                  <th className="pb-3 text-left font-medium">Client</th>
                  <th className="pb-3 text-left font-medium hidden md:table-cell">Notes</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-left font-medium hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181818]">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-600">
                      No invoices yet.
                    </td>
                  </tr>
                ) : (
                  recentApplications.map((app) => (
                    <tr key={app.id} className="group transition hover:bg-[#161616]">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/invoices/${app.id}`}
                          className="font-mono text-sm text-teal-400 hover:text-teal-300"
                        >
                          #{app.ref}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-sm text-white">{app.client}</td>
                      <td className="py-3 pr-4 text-sm text-gray-500 hidden md:table-cell">
                        {app.service}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${getStatusClasses(app.status)}`}
                        >
                          {app.status ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500 hidden sm:table-cell">
                        {formatDateShort(app.date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Service Mix */}
          <div className="rounded-xl border border-[#1e1e1e] bg-[#111111] p-5">
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Service Mix ({currentMonthLabel})
            </h2>
            <div className="flex justify-center">
              <DonutChart segments={serviceMix} size={148} />
            </div>
            <div className="mt-5 space-y-2.5">
              {serviceMix.length === 0 ? (
                <p className="text-center text-xs text-gray-600">No task data yet.</p>
              ) : (
                serviceMix.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="flex-1 truncate text-gray-400">{s.label}</span>
                    <span className="shrink-0 text-gray-600">— {s.pct}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom grid: Staff Workload + Monthly Revenue + Recent Activity ── */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Staff Workload */}
          <div className="rounded-xl border border-[#1e1e1e] bg-[#111111] p-5">
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Staff Workload
            </h2>
            <div className="space-y-4">
              {staffWorkload.length === 0 ? (
                <p className="text-xs text-gray-600">No open tasks.</p>
              ) : (
                staffWorkload.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c1c1c] text-xs font-semibold text-gray-300">
                      {s.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-white">{s.name}</span>
                        <span className="shrink-0 text-xs text-gray-500">{s.count} tasks</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#1e1e1e]">
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

          {/* Monthly Revenue */}
          <div className="rounded-xl border border-[#1e1e1e] bg-[#111111] p-5">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Monthly Revenue
            </h2>
            <p className="mb-4 text-2xl font-bold text-white">
              {formatCompact(currentMonthRevenue)}
            </p>
            <BarChart data={monthlyRevenueData} />
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-[#1e1e1e] bg-[#111111] p-5">
            <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-gray-600">No activity yet.</p>
              ) : (
                recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.dotColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-gray-300">{a.text}</p>
                      <p className="mt-0.5 text-[10px] tabular-nums text-gray-600">{a.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Quick access strip ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/invoices?filter=pending-collections"
            className="flex items-center justify-between rounded-xl border border-[#1e1e1e] bg-[#111111] px-5 py-4 transition hover:border-amber-800/50 hover:bg-[#151515]"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600">Pending Collections</p>
              <p className="mt-1 text-lg font-bold text-white">{pendingItems.length} invoices</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-amber-400">{formatCompact(totalOutstanding)}</p>
              <p className="text-xs text-gray-600">outstanding →</p>
            </div>
          </Link>

          <Link
            href="/daily-works"
            className="flex items-center justify-between rounded-xl border border-[#1e1e1e] bg-[#111111] px-5 py-4 transition hover:border-teal-800/50 hover:bg-[#151515]"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600">Open Tasks</p>
              <p className="mt-1 text-lg font-bold text-white">{openTasks.length} tasks</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-teal-400">Daily Works</p>
              <p className="text-xs text-gray-600">view worksheet →</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
