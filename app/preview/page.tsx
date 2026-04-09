import Image from 'next/image'
import Link from 'next/link'
import DashboardAccountControls from '@/components/dashboard-account-controls'
import alWahaaLogo from '@/Picture/alwahaa grp.png'
import {
  previewAppUser,
  previewClients,
  previewInvoices,
  previewReceipts,
  previewTasks,
} from '@/lib/preview-data'

type TaskRecord = {
  id: string
  invoice_id: string
  particulars: string | null
  assigned_to: string | null
  charged: number | null
  paid: number | null
  status: string | null
}

type ReceiptRecord = {
  id: string
  invoice_id: string
  amount: number | null
  receipt_no: string | null
  date: string | null
  created_at: string | null
}

const WORK_STATUSES = ['Pending', 'On Account', 'Paid', 'Done'] as const

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

function isOpenTask(status: string | null) {
  return (status ?? 'Pending') !== 'Done'
}

function NavItem({
  href,
  label,
  active = false,
}: {
  href: string
  label: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.14)]'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      {label}
    </Link>
  )
}

function OverviewCard({
  title,
  value,
  description,
  children,
}: {
  title: string
  value: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_26px_55px_rgba(15,23,42,0.10)]">
      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>
    </section>
  )
}

export default function PreviewDashboardPage() {
  const clientNames = new Map(previewClients.map((client) => [client.id, client.name] as const))
  const taskList = Object.values(previewTasks).flat() as TaskRecord[]
  const receiptList = Object.values(previewReceipts).flat() as ReceiptRecord[]
  const clientCount = previewClients.length
  const totalBilled = previewInvoices.reduce((sum, invoice) => sum + (invoice.total_amount ?? 0), 0)
  const totalCollection = receiptList.reduce((sum, receipt) => sum + (receipt.amount ?? 0), 0)
  const invoicesById = new Map(previewInvoices.map((invoice) => [invoice.id, invoice] as const))

  const openTasks = taskList.filter((task) => isOpenTask(task.status))
  const workStatus = WORK_STATUSES.map((status) => ({
    status,
    count: taskList.filter((task) => (task.status ?? 'Pending') === status).length,
  }))

  const teamLoadMap = new Map<string, { openTasks: number; activeInvoices: number }>()

  for (const invoice of previewInvoices) {
    const assignee = invoice.assigned_to?.trim()
    if (!assignee) {
      continue
    }

    const current = teamLoadMap.get(assignee) ?? { openTasks: 0, activeInvoices: 0 }
    if (['Active', 'Partial', 'Draft'].includes(invoice.status ?? '')) {
      current.activeInvoices += 1
    }
    teamLoadMap.set(assignee, current)
  }

  for (const task of openTasks) {
    const assignee = task.assigned_to?.trim() || 'Unassigned'
    const current = teamLoadMap.get(assignee) ?? { openTasks: 0, activeInvoices: 0 }
    current.openTasks += 1
    teamLoadMap.set(assignee, current)
  }

  const teamLoad = [...teamLoadMap.entries()]
    .map(([name, load]) => ({ name, ...load }))
    .sort((left, right) => {
      if (right.openTasks !== left.openTasks) {
        return right.openTasks - left.openTasks
      }

      return right.activeInvoices - left.activeInvoices
    })
    .slice(0, 4)

  const totalVendorOutstanding = openTasks.reduce(
    (sum, task) => sum + Math.max((task.charged ?? 0) - (task.paid ?? 0), 0),
    0
  )

  const latestInvoices = previewInvoices.slice(0, 5)
  const latestReceipts = [...receiptList].sort((left, right) => (right.date ?? '').localeCompare(left.date ?? '')).slice(0, 5)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]">
      <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6 lg:py-6">
        <div className="rounded-[34px] border border-white/80 bg-white/70 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:p-6">
          <header className="relative overflow-visible rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)] lg:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Link href="/preview" className="flex items-center gap-3">
                  <div className="rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm">
                    <Image
                      src={alWahaaLogo}
                      alt="Al Wahaa Group logo"
                      width={78}
                      height={78}
                      style={{ width: '52px', height: 'auto' }}
                      priority
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.7rem] uppercase tracking-[0.28em] text-amber-700">Al Wahaa Group</p>
                    <p className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</p>
                  </div>
                </Link>

                <nav className="mt-4 flex flex-wrap items-center gap-2">
                  <NavItem href="/preview" label="Home" active />
                  <NavItem href="/preview/invoices" label="Invoice" />
                  <NavItem href="/preview/clients" label="Client" />
                  <NavItem href="/preview/users" label="User" />
                </nav>
              </div>

              <div className="shrink-0 self-end lg:self-start">
                <DashboardAccountControls
                  email={previewAppUser.email}
                  fullName={previewAppUser.full_name}
                  role={previewAppUser.role}
                />
              </div>
            </div>
          </header>

          <main className="mt-6 space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OverviewCard
                title="Work Status"
                value={String(openTasks.length)}
                description="Tasks that still need progress from the operations side."
              >
                <div className="grid grid-cols-2 gap-2">
                  {workStatus.map((entry) => (
                    <div key={entry.status} className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{entry.status}</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{entry.count}</p>
                    </div>
                  ))}
                </div>
              </OverviewCard>

              <OverviewCard
                title="Team Load"
                value={String(teamLoad.length)}
                description="Users currently carrying invoice or task activity."
              >
                <div className="space-y-2">
                  {teamLoad.map((member) => (
                    <div key={member.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <p className="text-slate-500">{member.activeInvoices} active invoices</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
                        {member.openTasks} tasks
                      </span>
                    </div>
                  ))}
                </div>
              </OverviewCard>

              <OverviewCard
                title="Total Billed"
                value={formatCurrency(totalBilled)}
                description="Current invoice value recorded in the system."
              >
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                    <span>Total invoices</span>
                    <span className="font-semibold text-slate-900">{previewInvoices.length}</span>
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
                    <span className="font-semibold text-slate-900">{receiptList.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                    <span>Vendor outstanding</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(totalVendorOutstanding)}</span>
                  </div>
                </div>
              </OverviewCard>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Latest Invoice</h2>
                  <p className="text-sm text-slate-500">Recently created invoice entries.</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {latestInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/preview/invoices/${invoice.id}`}
                      className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr,0.9fr,0.7fr]"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{invoice.invoice_no}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {invoice.client_id ? clientNames.get(invoice.client_id) ?? 'Unknown client' : 'Unknown client'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Date</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(invoice.date)}</p>
                        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getInvoiceStatusClasses(invoice.status)}`}>
                          {invoice.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="md:text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Amount</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatCurrency(invoice.total_amount)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Latest Receipt</h2>
                  <p className="text-sm text-slate-500">Most recent receipt entries recorded.</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {latestReceipts.map((receipt) => {
                    const relatedInvoice = invoicesById.get(receipt.invoice_id)
                    const relatedClient =
                      relatedInvoice?.client_id ? clientNames.get(relatedInvoice.client_id) ?? 'Unknown client' : 'Unknown client'

                    return (
                      <Link
                        key={receipt.id}
                        href={`/preview/invoices/${receipt.invoice_id}`}
                        className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr,0.9fr,0.7fr]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{receipt.receipt_no || 'Receipt entry'}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {relatedInvoice?.invoice_no ?? 'Invoice'} · {relatedClient}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Date</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatDate(receipt.date || receipt.created_at)}
                          </p>
                        </div>
                        <div className="md:text-right">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Amount</p>
                          <p className="mt-1 font-semibold text-emerald-700">{formatCurrency(receipt.amount)}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
