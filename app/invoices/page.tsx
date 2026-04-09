import Link from 'next/link'
import { getUserPermissions, requireAuthenticatedAppUser } from '@/lib/auth'
import { getClientNameMap, getInvoices } from '@/lib/invoices'
import {
  buildInvoicesHref,
  getStatusFilter,
  getPaymentFilter,
  getSortField,
  type StatusFilter,
  type PaymentFilter,
  type SortField,
} from './invoice-query'
import InvoicesTableShell from './invoices-table-shell'

type InvoiceReceiptSummary = {
  invoice_id: string
  amount: number | null
}

function getPaymentStatus(totalAmount: number | null, paidAmount: number): 'Paid' | 'Partial' | 'Unpaid' {
  const total = totalAmount ?? 0
  if (paidAmount <= 0) return 'Unpaid'
  if (paidAmount >= total) return 'Paid'
  return 'Partial'
}

function getPaymentBadgeClasses(status: 'Paid' | 'Partial' | 'Unpaid') {
  switch (status) {
    case 'Paid': return 'bg-emerald-50 text-emerald-700'
    case 'Partial': return 'bg-amber-50 text-amber-700'
    case 'Unpaid': return 'bg-rose-50 text-rose-700'
  }
}

function formatCurrency(amount: number | null) {
  return `AED ${(amount ?? 0).toFixed(2)}`
}

function getInvoiceStatusLabel(status: string | null) {
  if (status === 'Draft' || status === 'Pending') {
    return 'Pending'
  }

  return status || 'Unknown'
}

function getStatusClasses(status: string | null) {
  switch (getInvoiceStatusLabel(status)) {
    case 'Pending':
      return 'bg-slate-100 text-slate-700'
    case 'Active':
      return 'bg-green-50 text-green-700'
    case 'Completed':
      return 'bg-blue-50 text-blue-700'
    case 'Partial':
      return 'bg-amber-50 text-amber-700'
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function getClientLabel(clientId: string | null, clientNames: Map<string, string>) {
  return clientId ? clientNames.get(clientId) ?? 'Unknown client' : 'Unknown client'
}

function compareInvoiceNumbers(leftInvoiceNo: string, rightInvoiceNo: string) {
  return leftInvoiceNo.localeCompare(rightInvoiceNo, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

type InvoicesPageProps = {
  searchParams: Promise<{
    query?: string | string[] | undefined
    order?: string | string[] | undefined
    sortBy?: string | string[] | undefined
    filter?: string | string[] | undefined
    status?: string | string[] | undefined
    payment?: string | string[] | undefined
  }>
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const resolvedSearchParams = await searchParams
  const searchQuery = getSingleSearchParam(resolvedSearchParams.query).trim()
  const sortOrder = getSingleSearchParam(resolvedSearchParams.order) === 'asc' ? 'asc' : 'desc'
  const sortBy = getSortField(getSingleSearchParam(resolvedSearchParams.sortBy))
  const activeFilter = getSingleSearchParam(resolvedSearchParams.filter) === 'pending-collections'
    ? 'pending-collections'
    : ''
  const requestedStatus = getSingleSearchParam(resolvedSearchParams.status)
  const activeStatusFilter = getStatusFilter(requestedStatus)
  const requestedPayment = getSingleSearchParam(resolvedSearchParams.payment)
  const activePaymentFilter = getPaymentFilter(requestedPayment)
  const normalizedSearchQuery = searchQuery.toLowerCase()
  const permissions = getUserPermissions(appUser.role)

  // Always fetch receipts so we can show payment status on every row
  const [invoices, clientNames, receiptsResponse] = await Promise.all([
    getInvoices(db),
    getClientNameMap(db),
    db.from('invoice_receipts').select('invoice_id, amount'),
  ])

  const receiptTotalsByInvoiceId = new Map<string, number>()
  for (const receipt of (receiptsResponse.data ?? []) as InvoiceReceiptSummary[]) {
    receiptTotalsByInvoiceId.set(
      receipt.invoice_id,
      (receiptTotalsByInvoiceId.get(receipt.invoice_id) ?? 0) + (receipt.amount ?? 0)
    )
  }

  const searchedInvoices = normalizedSearchQuery
    ? invoices.filter((invoice) => {
        const clientLabel = getClientLabel(invoice.client_id, clientNames).toLowerCase()
        return (
          invoice.invoice_no.toLowerCase().includes(normalizedSearchQuery) ||
          clientLabel.includes(normalizedSearchQuery) ||
          (invoice.notes ?? '').toLowerCase().includes(normalizedSearchQuery)
        )
      })
    : invoices

  const filteredInvoices = activeFilter === 'pending-collections'
    ? searchedInvoices.filter((invoice) => {
        const collectedAmount = receiptTotalsByInvoiceId.get(invoice.id) ?? 0
        return Math.max((invoice.total_amount ?? 0) - collectedAmount, 0) > 0 && getInvoiceStatusLabel(invoice.status) !== 'Cancelled'
      })
    : searchedInvoices

  const statusFilteredInvoices = activeStatusFilter
    ? filteredInvoices.filter((invoice) => getInvoiceStatusLabel(invoice.status) === activeStatusFilter)
    : filteredInvoices

  const paymentFilteredInvoices = activePaymentFilter
    ? statusFilteredInvoices.filter((invoice) => {
        const paidAmount = receiptTotalsByInvoiceId.get(invoice.id) ?? 0
        return getPaymentStatus(invoice.total_amount, paidAmount) === activePaymentFilter
      })
    : statusFilteredInvoices

  const sortedInvoices = [...paymentFilteredInvoices].sort((left, right) => {
    const dir = sortOrder === 'asc' ? 1 : -1
    if (sortBy === 'date') {
      return ((left.date ?? '') > (right.date ?? '') ? 1 : -1) * dir
    }
    if (sortBy === 'amount') {
      return ((left.total_amount ?? 0) - (right.total_amount ?? 0)) * dir
    }
    return compareInvoiceNumbers(
      sortOrder === 'asc' ? left.invoice_no : right.invoice_no,
      sortOrder === 'asc' ? right.invoice_no : left.invoice_no,
    )
  })

  const nextSortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
  function sortHref(field: SortField) {
    const nextOrder = sortBy === field ? nextSortOrder : 'desc'
    return buildInvoicesHref({ query: searchQuery || undefined, sortBy: field === 'invoice_no' ? undefined : field, order: nextOrder !== 'desc' ? nextOrder : undefined, filter: activeFilter || undefined, status: activeStatusFilter || undefined, payment: activePaymentFilter || undefined })
  }
  const invoiceNoSortHref = sortHref('invoice_no')

  const accessLabel = permissions.canCreateInvoices
    ? ''
    : permissions.canManageServiceOrders || permissions.canManageTasks || permissions.canManageReceipts
      ? ' · Limited edit access'
      : ' · View only access'
  const filterLabel = activeFilter === 'pending-collections' ? ' · Pending collections only' : ''
  const statusFilterLabel = activeStatusFilter ? ` · Status: ${activeStatusFilter}` : ''
  const paymentFilterLabel = activePaymentFilter ? ` · Payment: ${activePaymentFilter}` : ''
  const shownCount = paymentFilteredInvoices.length
  const resultLabel = searchQuery
    ? `${shownCount} result${shownCount === 1 ? '' : 's'} for "${searchQuery}" · ${invoices.length} invoices total${accessLabel}${filterLabel}${statusFilterLabel}${paymentFilterLabel}`
    : `${shownCount} invoices shown · ${invoices.length} invoices total${accessLabel}${filterLabel}${statusFilterLabel}${paymentFilterLabel}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Invoices</h1>
            <p className="text-sm text-slate-500">{resultLabel}</p>
          </div>
          {permissions.canCreateInvoices ? (
            <Link href="/invoices/new" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-slate-800">
              + New Invoice
            </Link>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-8">
        {activeFilter ? (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>Showing only invoices with pending collections.</span>
            <Link
              href={buildInvoicesHref({ query: searchQuery || undefined, order: sortOrder, status: activeStatusFilter || undefined })}
              className="font-medium text-amber-700 hover:text-amber-900"
            >
              Show all invoices
            </Link>
          </div>
        ) : null}

        <InvoicesTableShell
          activeFilter={activeFilter}
          activeStatusFilter={activeStatusFilter as StatusFilter | ''}
          activePaymentFilter={activePaymentFilter as PaymentFilter | ''}
          invoiceNoSortHref={invoiceNoSortHref}
          searchQuery={searchQuery}
          sortOrder={sortOrder}
          emptyState={sortedInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-lg">{searchQuery ? 'No matching invoices found' : 'No invoices yet'}</p>
              <p className="mt-1 text-sm">
                {searchQuery
                  ? 'Try a different invoice number, client name, or note keyword.'
                  : 'Create your first invoice to see it here.'}
              </p>
            </div>
          ) : undefined}
        >
          {sortedInvoices.map((invoice) => {
            const paidAmount = receiptTotalsByInvoiceId.get(invoice.id) ?? 0
            const paymentStatus = getPaymentStatus(invoice.total_amount, paidAmount)
            return (
              <tr key={invoice.id} className="transition hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-blue-700">
                  <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                    {invoice.invoice_no}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {getClientLabel(invoice.client_id, clientNames)}
                </td>
                <td className="max-w-sm truncate px-4 py-3 text-gray-600" title={invoice.notes?.trim() || ''}>
                  {invoice.notes?.trim() || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{invoice.date || 'Not set'}</td>
                <td className="px-4 py-3 text-gray-600">{invoice.assigned_to || 'Unassigned'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(invoice.status)}`}>
                    {getInvoiceStatusLabel(invoice.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPaymentBadgeClasses(paymentStatus)}`}>
                    {paymentStatus}
                  </span>
                  {paymentStatus === 'Partial' ? (
                    <p className="mt-0.5 text-[0.7rem] text-slate-400">{formatCurrency(paidAmount)} paid</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
              </tr>
            )
          })}
        </InvoicesTableShell>
      </div>
    </div>
  )
}
