import Link from 'next/link'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getDailyWorks } from '@/lib/daily-works'
import { selectAllInvoiceTasks, type InvoiceTaskRecord } from '@/lib/invoice-tasks'
import { getClientNameMap, getInvoices } from '@/lib/invoices'
import DashboardTeamLoadCard from '@/components/dashboard-team-load-card'

type InvoiceReceiptSummary = {
  id: string
  invoice_id: string
  amount: number | null
  receipt_no: string | null
  date: string | null
  created_at: string | null
}

function formatCurrency(amount: number | null) {
  return `AED ${(amount ?? 0).toFixed(2)}`
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not set'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

function getTodayDateValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60_000))
  return localTime.toISOString().slice(0, 10)
}

function getDateOnlyValue(value: string | null) {
  if (!value) {
    return null
  }

  return value.slice(0, 10)
}

function getTaskDateValue(task: InvoiceTaskRecord) {
  return task.task_date ?? getDateOnlyValue(task.created_at)
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

function getTaskAgeLabel(days: number) {
  return `${days} day${days === 1 ? '' : 's'} open`
}

function getClientLabel(clientId: string | null, clientNames: Map<string, string>) {
  return clientId ? clientNames.get(clientId) ?? 'Unknown client' : 'Unknown client'
}

function getInvoiceStatusClasses(status: string | null) {
  switch (status) {
    case 'Partial':
      return 'bg-amber-50 text-amber-700'
    case 'Active':
      return 'bg-emerald-50 text-emerald-700'
    case 'Completed':
      return 'bg-sky-50 text-sky-700'
    case 'Draft':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getTaskStatusClasses(status: string | null) {
  switch (status) {
    case 'On Account':
      return 'bg-amber-50 text-amber-700'
    case 'Paid':
      return 'bg-sky-50 text-sky-700'
    case 'Done':
      return 'bg-emerald-50 text-emerald-700'
    default:
      return 'bg-rose-50 text-rose-700'
  }
}

function isOpenTask(status: string | null) {
  return (status ?? 'Pending') !== 'Done'
}

function OverviewCard({
  title,
  value,
  description,
  children,
  href,
}: {
  title: string
  value: string
  description: string
  children: React.ReactNode
  href?: string
}) {
  const cardClassName = 'group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_26px_55px_rgba(15,23,42,0.10)]'
  const content = (
    <>
      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`${cardClassName} block`}>
        {content}
      </Link>
    )
  }

  return (
    <section className={cardClassName}>
      {content}
    </section>
  )
}

function DashboardPanel({
  title,
  description,
  aside,
  children,
}: {
  title: string
  description: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

export default async function Home() {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const [invoices, clientNames, clientsResponse, tasksResult, receiptsResponse, dailyWorksResult] = await Promise.all([
    getInvoices(db),
    getClientNameMap(db),
    db.from('clients').select('id', { count: 'exact', head: true }),
    selectAllInvoiceTasks(db),
    db
      .from('invoice_receipts')
      .select('id, invoice_id, amount, receipt_no, date, created_at')
      .order('date', { ascending: false }),
    getDailyWorks(undefined, db),
  ])

  const tasks = (tasksResult.data ?? []) as InvoiceTaskRecord[]
  const receipts = (receiptsResponse.data ?? []) as InvoiceReceiptSummary[]
  const clientCount = clientsResponse.count ?? 0
  const totalBilled = invoices.reduce((sum, invoice) => sum + (invoice.total_amount ?? 0), 0)
  const totalCollection = receipts.reduce((sum, receipt) => sum + (receipt.amount ?? 0), 0)
  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice] as const))

  const openTasks = tasks.filter((task) => isOpenTask(task.status))
  const dailyWorks = dailyWorksResult.data
  const dailyWorksPreview = dailyWorks.slice(0, 4)
  const todayDateValue = dailyWorksResult.date || getTodayDateValue()

  const receiptTotalsByInvoiceId = new Map<string, number>()
  for (const receipt of receipts) {
    receiptTotalsByInvoiceId.set(
      receipt.invoice_id,
      (receiptTotalsByInvoiceId.get(receipt.invoice_id) ?? 0) + (receipt.amount ?? 0)
    )
  }

  const allPendingCollections = invoices
    .map((invoice) => {
      const paidAmount = receiptTotalsByInvoiceId.get(invoice.id) ?? 0
      const outstanding = Math.max((invoice.total_amount ?? 0) - paidAmount, 0)

      return {
        invoice,
        clientLabel: getClientLabel(invoice.client_id, clientNames),
        paidAmount,
        outstanding,
      }
    })
    .filter(({ invoice, outstanding }) => outstanding > 0 && (invoice.status ?? '') !== 'Cancelled')
    .sort((left, right) => right.outstanding - left.outstanding || (left.invoice.date ?? '').localeCompare(right.invoice.date ?? ''))

  const pendingCollections = allPendingCollections.slice(0, 6)
  const totalPendingCollectionOutstanding = allPendingCollections.reduce((sum, row) => sum + row.outstanding, 0)

  const allOverdueTasks = openTasks
    .map((task) => {
      const invoice = invoicesById.get(task.invoice_id)
      const taskDateValue = getTaskDateValue(task)
      const ageDays = taskDateValue ? getDaysBetween(taskDateValue, todayDateValue) : 0

      return {
        task,
        invoice,
        clientLabel: getClientLabel(invoice?.client_id ?? null, clientNames),
        taskDateValue,
        ageDays,
      }
    })
    .filter((entry) => entry.ageDays >= 3)
    .sort((left, right) => right.ageDays - left.ageDays || left.clientLabel.localeCompare(right.clientLabel))

  const overdueTasks = allOverdueTasks.slice(0, 6)

  const departmentQueue = [...openTasks.reduce((queueMap, task) => {
    const department = task.dept?.trim() || 'OTHER'
    const current = queueMap.get(department) ?? { department, openCount: 0, pendingCount: 0, onAccountCount: 0, outstandingAmount: 0 }
    current.openCount += 1
    if ((task.status ?? 'Pending') === 'Pending') {
      current.pendingCount += 1
    }
    if (task.status === 'On Account') {
      current.onAccountCount += 1
    }
    current.outstandingAmount += Math.max((task.charged ?? 0) - (task.paid ?? 0), 0)
    queueMap.set(department, current)
    return queueMap
  }, new Map<string, { department: string; openCount: number; pendingCount: number; onAccountCount: number; outstandingAmount: number }>()).values()]
    .sort((left, right) => right.openCount - left.openCount || right.outstandingAmount - left.outstandingAmount || left.department.localeCompare(right.department))

  const totalVendorOutstanding = openTasks.reduce(
    (sum, task) => sum + Math.max((task.charged ?? 0) - (task.paid ?? 0), 0),
    0
  )

  const latestInvoices = invoices.slice(0, 5)
  const latestReceipts = receipts.slice(0, 5)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6 lg:py-6">
        <div className="rounded-[34px] border border-white/80 bg-white/70 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:p-6">
          <main className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OverviewCard
                title="Daily Works"
                value={String(dailyWorks.length)}
                description="Open the daily worksheet and review task, service order, and invoice activity for the day."
                href="/daily-works"
              >
                {dailyWorksPreview.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No daily tasks found. Click to open the worksheet and switch dates.
                  </p>
                ) : (
                  <div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                    {dailyWorksPreview.map((item) => (
                      <div key={item.id} className="min-w-[240px] rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{item.task || 'Untitled task'}</p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-slate-600 shadow-sm">
                            {item.dept || 'Task'}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-500">
                          {item.client_name || 'Unknown client'} · {item.invoice_no || 'Invoice'}
                        </p>
                      </div>
                    ))}
                    </div>
                    <div className="pt-1 text-xs font-medium uppercase tracking-[0.16em] text-blue-700">
                      Open worksheet
                    </div>
                  </div>
                )}
              </OverviewCard>

              <DashboardTeamLoadCard
                initialDate={dailyWorksResult.date}
                initialItems={dailyWorks}
              />

              <OverviewCard
                title="Total Billed"
                value={formatCurrency(totalBilled)}
                description="Current invoice value recorded in the system."
              >
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                    <span>Total invoices</span>
                    <span className="font-semibold text-slate-900">{invoices.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                    <span>Total clients</span>
                    <span className="font-semibold text-slate-900">{clientCount}</span>
                  </div>
                </div>
              </OverviewCard>

              <OverviewCard
                title="Total Collection"
                value={formatCurrency(totalCollection)}
                description="Receipts collected and vendor side still pending."
              >
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                    <span>Receipt entries</span>
                    <span className="font-semibold text-slate-900">{receipts.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                    <span>Vendor outstanding</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(totalVendorOutstanding)}</span>
                  </div>
                </div>
              </OverviewCard>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
              <DashboardPanel
                title="Pending Collections"
                description="Invoices that still have money to be collected from clients."
                aside={
                  <div className="text-left md:text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Outstanding</p>
                    <p className="mt-1 text-lg font-semibold text-amber-700">{formatCurrency(totalPendingCollectionOutstanding)}</p>
                    <p className="text-sm text-slate-500">{allPendingCollections.length} invoices</p>
                    <Link
                      href="/invoices?filter=pending-collections"
                      className="mt-2 inline-block text-xs font-medium uppercase tracking-[0.14em] text-blue-700 hover:text-blue-800"
                    >
                      Open unpaid invoices
                    </Link>
                  </div>
                }
              >
                {pendingCollections.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-slate-500">No pending collections right now.</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto px-5 py-5">
                    {pendingCollections.map(({ invoice, clientLabel, paidAmount, outstanding }) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="min-w-[255px] rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{invoice.invoice_no}</p>
                          <p className="mt-1 text-sm text-slate-500">{clientLabel}</p>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Collected</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatCurrency(paidAmount)} / {formatCurrency(invoice.total_amount)}
                          </p>
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getInvoiceStatusClasses(invoice.status)}`}>
                            {invoice.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Outstanding</p>
                          <p className="mt-1 font-semibold text-amber-700">{formatCurrency(outstanding)}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDate(invoice.date)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Overdue / Stuck Tasks"
                description="Open tasks that have been sitting for 3 or more days."
                aside={
                  <div className="text-left md:text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Open 3+ Days</p>
                    <p className="mt-1 text-lg font-semibold text-rose-700">{allOverdueTasks.length}</p>
                    <p className="text-sm text-slate-500">Needs follow-up</p>
                  </div>
                }
              >
                {overdueTasks.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-slate-500">No stuck tasks right now.</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto px-5 py-5">
                    {overdueTasks.map(({ task, invoice, clientLabel, taskDateValue, ageDays }) => (
                      <Link
                        key={task.id}
                        href={`/invoices/${task.invoice_id}`}
                        className="min-w-[255px] rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{task.particulars || 'Untitled task'}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {clientLabel} · {invoice?.invoice_no ?? 'Invoice'}
                          </p>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Assigned To</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{task.assigned_to || 'Unassigned'}</p>
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getTaskStatusClasses(task.status)}`}>
                            {task.status || 'Pending'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Open Since</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(taskDateValue || task.created_at)}</p>
                          <p className="mt-1 font-semibold text-rose-700">{getTaskAgeLabel(ageDays)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Department Queue"
                description="Open operational tasks currently sitting with each department."
                aside={
                  <div className="text-left md:text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Open Tasks</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{openTasks.length}</p>
                    <p className="text-sm text-slate-500">{departmentQueue.length} departments</p>
                  </div>
                }
              >
                {departmentQueue.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-slate-500">No department queues yet.</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto px-5 py-5">
                    {departmentQueue.map((department) => (
                      <Link
                        key={department.department}
                        href={`/daily-works?date=${encodeURIComponent(todayDateValue)}&dept=${encodeURIComponent(department.department)}`}
                        className="min-w-[240px] rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{department.department}</p>
                          <p className="mt-1 text-sm text-slate-500">{department.openCount} open tasks</p>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Queue Mix</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {department.pendingCount} pending · {department.onAccountCount} on account
                          </p>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Outstanding</p>
                          <p className="mt-1 font-semibold text-slate-900">{formatCurrency(department.outstandingAmount)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </DashboardPanel>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Latest Invoice</h2>
                  <p className="text-sm text-slate-500">Recently created invoice entries.</p>
                </div>

                {latestInvoices.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-slate-500">No invoices yet.</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto px-5 py-5">
                    {latestInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="min-w-[255px] rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{invoice.invoice_no}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {invoice.client_id ? clientNames.get(invoice.client_id) ?? 'Unknown client' : 'Unknown client'}
                          </p>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Date</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(invoice.date)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getInvoiceStatusClasses(invoice.status)}`}>
                            {invoice.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Amount</p>
                          <p className="mt-1 font-semibold text-slate-900">{formatCurrency(invoice.total_amount)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Latest Receipt</h2>
                  <p className="text-sm text-slate-500">Most recent receipt entries recorded.</p>
                </div>

                {latestReceipts.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-slate-500">No receipts yet.</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto px-5 py-5">
                    {latestReceipts.map((receipt) => {
                      const relatedInvoice = invoicesById.get(receipt.invoice_id)
                      const relatedClient =
                        relatedInvoice?.client_id ? clientNames.get(relatedInvoice.client_id) ?? 'Unknown client' : 'Unknown client'

                      return (
                        <Link
                          key={receipt.id}
                          href={`/invoices/${receipt.invoice_id}`}
                          className="min-w-[255px] rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{receipt.receipt_no || 'Receipt entry'}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {relatedInvoice?.invoice_no ?? 'Invoice'} · {relatedClient}
                            </p>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Date</p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              {formatDate(receipt.date || receipt.created_at)}
                            </p>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Amount</p>
                            <p className="mt-1 font-semibold text-emerald-700">{formatCurrency(receipt.amount)}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
