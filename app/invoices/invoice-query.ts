export const STATUS_FILTER_OPTIONS = ['Pending', 'Active', 'Completed', 'Partial', 'Cancelled'] as const

export type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]

export function getStatusFilter(value: string) {
  return STATUS_FILTER_OPTIONS.includes(value as StatusFilter) ? (value as StatusFilter) : ''
}

export const PAYMENT_FILTER_OPTIONS = ['Paid', 'Partial', 'Unpaid'] as const

export type PaymentFilter = (typeof PAYMENT_FILTER_OPTIONS)[number]

export function getPaymentFilter(value: string) {
  return PAYMENT_FILTER_OPTIONS.includes(value as PaymentFilter) ? (value as PaymentFilter) : ''
}

export const SORT_FIELDS = ['invoice_no', 'date', 'amount'] as const
export type SortField = (typeof SORT_FIELDS)[number]

export function getSortField(value: string): SortField {
  return SORT_FIELDS.includes(value as SortField) ? (value as SortField) : 'invoice_no'
}

export function buildInvoicesHref({
  query,
  order,
  sortBy,
  filter,
  status,
  payment,
}: {
  query?: string
  order?: 'asc' | 'desc'
  sortBy?: SortField
  filter?: string
  status?: string
  payment?: string
}) {
  const params = new URLSearchParams()

  if (query) params.set('query', query)
  if (order && order !== 'desc') params.set('order', order)
  if (sortBy && sortBy !== 'invoice_no') params.set('sortBy', sortBy)
  if (filter) params.set('filter', filter)
  if (status) params.set('status', status)
  if (payment) params.set('payment', payment)

  const queryString = params.toString()
  return queryString ? `/invoices?${queryString}` : '/invoices'
}
