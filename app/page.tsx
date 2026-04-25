import { requireAuthenticatedAppUser } from '@/lib/auth'
import { selectAllInvoiceTasks, type InvoiceTaskRecord } from '@/lib/invoice-tasks'
import { getClientNameMap, getInvoices } from '@/lib/invoices'
import DashboardClient, { type DashboardData } from './dashboard-client'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CHART_COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#f97316', '#6b7280']
const STAFF_COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6']

// ─── Types ────────────────────────────────────────────────────────────────────

type ReceiptRow = {
  id: string
  invoice_id: string
  amount: number | null
  payment_mode: string | null
  date: string | null
  created_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function mkInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getTodayDateValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60_000))
  return localTime.toISOString().slice(0, 10)
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
      .select('id, invoice_id, amount, payment_mode, date, created_at')
      .order('created_at', { ascending: false }),
  ])

  const tasks = (tasksResult.data ?? []) as InvoiceTaskRecord[]
  const receipts = (receiptsResult.data ?? []) as ReceiptRow[]

  // ── Date context ──
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
  const oneWeekAgoStr = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10)
  const currentMonthLabel = MONTH_NAMES[now.getMonth()].toUpperCase()
  const prevMonthLabel = MONTH_NAMES[prevMonthDate.getMonth()]

  // ── Receipt totals per invoice ──
  const receiptTotals = new Map<string, number>()
  for (const r of receipts) {
    receiptTotals.set(r.invoice_id, (receiptTotals.get(r.invoice_id) ?? 0) + (r.amount ?? 0))
  }

  // ── Stat cards ──
  const activeInvoices = invoices.filter((i) =>
    ['Active', 'Pending', 'Partial'].includes(i.status ?? '')
  )
  const thisWeekCount = invoices.filter((i) => (i.created_at ?? '') >= oneWeekAgoStr).length

  const currentMonthRevenue = invoices
    .filter((i) => (i.date ?? '').startsWith(currentMonthKey) && i.status !== 'Cancelled')
    .reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const prevMonthRevenue = invoices
    .filter((i) => (i.date ?? '').startsWith(prevMonthKey) && i.status !== 'Cancelled')
    .reduce((s, i) => s + (i.total_amount ?? 0), 0)

  const pendingItems = invoices
    .filter((i) => i.status !== 'Cancelled')
    .map((i) => ({
      invoice: i,
      outstanding: Math.max((i.total_amount ?? 0) - (receiptTotals.get(i.id) ?? 0), 0),
    }))
    .filter((x) => x.outstanding > 0)
  const totalOutstanding = pendingItems.reduce((s, x) => s + x.outstanding, 0)

  const completedThisMonth = invoices.filter(
    (i) => i.status === 'Completed' && (i.date ?? '').startsWith(currentMonthKey)
  )
  const cancelledThisMonth = invoices.filter(
    (i) => i.status === 'Cancelled' && (i.date ?? '').startsWith(currentMonthKey)
  )
  const finishedTotal = completedThisMonth.length + cancelledThisMonth.length
  const successRate =
    finishedTotal > 0 ? (completedThisMonth.length / finishedTotal) * 100 : null

  // ── Monthly revenue ──
  const last4Months = getLastNMonths(4)
  const last4MonthRevenue = last4Months.map(({ key, label }) => ({
    label,
    value: invoices
      .filter((i) => (i.date ?? '').startsWith(key) && i.status !== 'Cancelled')
      .reduce((s, i) => s + (i.total_amount ?? 0), 0),
  }))

  const last6Months = getLastNMonths(6)
  const last6MonthRevenue = last6Months.map(({ key, label }) => ({
    label,
    value: invoices
      .filter((i) => (i.date ?? '').startsWith(key) && i.status !== 'Cancelled')
      .reduce((s, i) => s + (i.total_amount ?? 0), 0),
  }))

  // ── Service mix ──
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

  // ── Staff workload (open tasks only) ──
  const openTasks = tasks.filter((t) => (t.status ?? 'Pending') !== 'Done')
  const allOpenTaskCount = openTasks.length
  const todayDate = getTodayDateValue()
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
      initials: mkInitials(name),
      pct: Math.round((count / maxWorkload) * 100),
    }))

  // ── Staff details (all tasks per person) ──
  function buildStaffDetails(taskList: InvoiceTaskRecord[]) {
    const map = new Map<string, { openTasks: number; doneTasks: number; depts: Set<string> }>()
    for (const t of taskList) {
      const name = t.assigned_to?.trim() || 'Unassigned'
      if (!map.has(name)) map.set(name, { openTasks: 0, doneTasks: 0, depts: new Set() })
      const entry = map.get(name)!
      if ((t.status ?? 'Pending') === 'Done') entry.doneTasks++
      else entry.openTasks++
      if (t.dept?.trim()) entry.depts.add(t.dept.trim())
    }
    return [...map.entries()]
      .sort((a, b) => b[1].openTasks + b[1].doneTasks - (a[1].openTasks + a[1].doneTasks))
      .map(([name, data], i) => ({
        name,
        initials: mkInitials(name),
        openTasks: data.openTasks,
        doneTasks: data.doneTasks,
        totalTasks: data.openTasks + data.doneTasks,
        depts: [...data.depts],
        color: STAFF_COLORS[i % STAFF_COLORS.length],
      }))
  }

  const staffDetails = buildStaffDetails(tasks)
  const staffDetailsThisMonth = buildStaffDetails(tasks.filter((t) => (t.created_at ?? '').slice(0, 7) === currentMonthKey))
  const staffDetailsThisWeek = buildStaffDetails(tasks.filter((t) => (t.created_at ?? '').slice(0, 10) >= oneWeekAgoStr))

  // ── Recent applications ──
  const recentApplications = invoices.slice(0, 5).map((i) => ({
    id: i.id,
    ref: i.invoice_no,
    client: i.client_id ? (clientNames.get(i.client_id) ?? 'Unknown') : 'Unknown',
    service: i.notes?.slice(0, 38) ?? '—',
    status: i.status,
    date: i.date,
  }))

  // ── All invoices (Applications tab) ──
  const allInvoices = invoices.map((i) => ({
    id: i.id,
    ref: i.invoice_no,
    client: i.client_id ? (clientNames.get(i.client_id) ?? 'Unknown') : 'Unknown',
    service: i.notes?.slice(0, 50) ?? '',
    status: i.status,
    date: i.date,
    amount: i.total_amount,
    assignedTo: i.assigned_to ?? null,
  }))

  // ── Status counts ──
  const statusCounts: Record<string, number> = {}
  for (const i of invoices) {
    const s = i.status ?? 'Unknown'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  // ── Finance totals ──
  const totalBilled = invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const totalCollected = receipts.reduce((s, r) => s + (r.amount ?? 0), 0)

  // ── Client-wise outstanding ──
  const clientOutstandingMap = new Map<string, { clientName: string; billed: number; collected: number }>()
  for (const inv of invoices) {
    if (inv.status === 'Cancelled') continue
    const clientName = inv.client_id ? (clientNames.get(inv.client_id) ?? 'Unknown') : 'Unknown'
    const key = inv.client_id ?? 'unknown'
    if (!clientOutstandingMap.has(key)) clientOutstandingMap.set(key, { clientName, billed: 0, collected: 0 })
    const entry = clientOutstandingMap.get(key)!
    entry.billed += inv.total_amount ?? 0
    entry.collected += receiptTotals.get(inv.id) ?? 0
  }
  const clientOutstanding = [...clientOutstandingMap.entries()]
    .map(([clientId, c]) => ({ clientId, ...c, outstanding: Math.max(c.billed - c.collected, 0) }))
    .filter((c) => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 20)

  // ── Receipts by payment mode ──
  const modeMap = new Map<string, { count: number; total: number }>()
  for (const r of receipts) {
    const mode = r.payment_mode?.trim() || 'Unknown'
    if (!modeMap.has(mode)) modeMap.set(mode, { count: 0, total: 0 })
    const entry = modeMap.get(mode)!
    entry.count++
    entry.total += r.amount ?? 0
  }
  const receiptsByMode = [...modeMap.entries()]
    .map(([mode, data]) => ({ mode, count: data.count, total: data.total }))
    .sort((a, b) => b.total - a.total)

  // ── Recent activity ──
  const recentActivity = [
    ...invoices.slice(0, 4).map((i) => ({
      time: i.created_at?.slice(11, 16) ?? '',
      text: `Invoice #${i.invoice_no} — ${i.client_id ? (clientNames.get(i.client_id) ?? '') : ''}`,
      type: 'invoice' as const,
    })),
    ...tasks.slice(0, 4).map((t) => ({
      time: t.created_at?.slice(11, 16) ?? '',
      text: `Task: ${(t.particulars ?? 'Untitled').slice(0, 40)}`,
      type: 'task' as const,
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 6)

  const dashData: DashboardData = {
    activeCount: activeInvoices.length,
    thisWeekCount,
    currentMonthRevenue,
    prevMonthRevenue,
    currentMonthLabel,
    prevMonthLabel,
    pendingCount: pendingItems.length,
    totalOutstanding,
    completedThisMonthCount: completedThisMonth.length,
    successRate,
    last4MonthRevenue,
    serviceMix,
    staffWorkload,
    recentApplications,
    recentActivity,
    allInvoices,
    statusCounts,
    last6MonthRevenue,
    receiptsByMode,
    totalBilled,
    totalCollected,
    clientOutstanding,
    staffDetails,
    staffDetailsThisMonth,
    staffDetailsThisWeek,
    allOpenTaskCount,
  }

  return <DashboardClient data={dashData} />
}
