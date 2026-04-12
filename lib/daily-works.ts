import { supabase } from '@/lib/supabase'
import { selectServiceOrdersByInvoiceIds } from '@/lib/service-orders'

type QueryClient = Pick<typeof supabase, 'from'>

type DailyTaskRecord = {
  id: string
  invoice_id: string
  dept: string | null
  particulars: string | null
  assigned_to: string | null
  charged: number | null
  paid: number | null
  payment_mode: string | null
  ref_no: string | null
  status: string | null
  notes: string | null
  task_date?: string | null
  created_at: string | null
}

type InvoiceLookupRecord = {
  id: string
  invoice_no: string
  client_id: string | null
  beneficiary_name: string | null
  date: string | null
  status: string | null
}

type ClientLookupRecord = {
  id: string
  name: string
}

type SupabaseErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

export type DailyWorkItem = {
  id: string
  invoice_id: string
  invoice_no: string | null
  invoice_date: string | null
  invoice_status: string | null
  client_name: string | null
  beneficiary_name: string | null
  assigned_to: string | null
  dept: string | null
  task: string | null
  service_orders: string[]
  task_date: string | null
  status: string | null
  payment_mode: string | null
  ref_no: string | null
  notes: string | null
  charged: number | null
  paid: number | null
  difference: number
}

const DAILY_TASK_SELECT =
  'id, invoice_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, task_date, created_at'
const LEGACY_DAILY_TASK_SELECT =
  'id, invoice_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, created_at'

function getTodayDateValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60_000))
  return localTime.toISOString().slice(0, 10)
}

export function normalizeDailyWorksDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getTodayDateValue()
  }

  return value
}

function getNextDateValue(dateValue: string) {
  const nextDate = new Date(`${dateValue}T00:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  return nextDate.toISOString().slice(0, 10)
}

function isMissingTaskDateColumn(error: SupabaseErrorLike | null) {
  if (!error) {
    return false
  }

  const message = [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase()
  return error.code === 'PGRST204' || error.code === '42703' || message.includes('task_date')
}

function normalizeTaskRecord(task: Omit<DailyTaskRecord, 'task_date'> & { task_date?: string | null }): DailyTaskRecord {
  return {
    ...task,
    task_date: task.task_date ?? null,
  }
}

async function selectDailyTaskRows(dateValue: string, queryClient: QueryClient) {
  const startDateTime = `${dateValue}T00:00:00Z`
  const endDateTime = `${getNextDateValue(dateValue)}T00:00:00Z`

  // Match tasks where task_date is explicitly set to this date,
  // OR where task_date is null and created_at falls on this day (legacy/old tasks).
  const primaryResult = await queryClient
    .from('invoice_tasks')
    .select(DAILY_TASK_SELECT)
    .or(
      `task_date.eq.${dateValue},and(task_date.is.null,created_at.gte.${startDateTime},created_at.lt.${endDateTime})`
    )
    .order('assigned_to', { ascending: true })
    .order('created_at', { ascending: true })

  if (!primaryResult.error || !isMissingTaskDateColumn(primaryResult.error)) {
    return {
      ...primaryResult,
      data: ((primaryResult.data ?? []) as DailyTaskRecord[]).map(normalizeTaskRecord),
    }
  }

  // Fallback for databases that don't have the task_date column yet.
  const legacyResult = await queryClient
    .from('invoice_tasks')
    .select(LEGACY_DAILY_TASK_SELECT)
    .gte('created_at', startDateTime)
    .lt('created_at', endDateTime)
    .order('assigned_to', { ascending: true })
    .order('created_at', { ascending: true })

  return {
    ...legacyResult,
    data: ((legacyResult.data ?? []) as Array<Omit<DailyTaskRecord, 'task_date'>>).map(normalizeTaskRecord),
  }
}

export async function getDailyWorks(
  date: string | null | undefined,
  queryClient: QueryClient = supabase
) {
  const normalizedDate = normalizeDailyWorksDate(date)
  const taskRowsResult = await selectDailyTaskRows(normalizedDate, queryClient)

  if (taskRowsResult.error) {
    return {
      date: normalizedDate,
      data: [] as DailyWorkItem[],
      error: taskRowsResult.error,
    }
  }

  const taskRows = (taskRowsResult.data ?? []) as DailyTaskRecord[]
  if (taskRows.length === 0) {
    return {
      date: normalizedDate,
      data: [] as DailyWorkItem[],
      error: null,
    }
  }

  const invoiceIds = [...new Set(taskRows.map((task) => task.invoice_id).filter(Boolean))]
  const { data: invoiceRows, error: invoiceError } = await queryClient
    .from('invoices')
    .select('id, invoice_no, client_id, beneficiary_name, date, status')
    .in('id', invoiceIds)

  if (invoiceError) {
    return {
      date: normalizedDate,
      data: [] as DailyWorkItem[],
      error: invoiceError,
    }
  }

  const invoices = (invoiceRows ?? []) as InvoiceLookupRecord[]
  const invoiceLookup = new Map(invoices.map((invoice) => [invoice.id, invoice] as const))
  const clientIds = [...new Set(invoices.map((invoice) => invoice.client_id).filter(Boolean))] as string[]

  const { data: clientRows, error: clientError } = clientIds.length > 0
    ? await queryClient.from('clients').select('id, name').in('id', clientIds)
    : { data: [] as ClientLookupRecord[], error: null }

  if (clientError) {
    return {
      date: normalizedDate,
      data: [] as DailyWorkItem[],
      error: clientError,
    }
  }

  const clientLookup = new Map(((clientRows ?? []) as ClientLookupRecord[]).map((client) => [client.id, client] as const))
  const serviceOrderLookup = new Map<string, string[]>()
  const serviceOrderResult = await selectServiceOrdersByInvoiceIds(invoiceIds, queryClient)

  for (const serviceOrder of (serviceOrderResult.data ?? []) as Array<{
    description: string
    invoice_id: string
  }>) {
    const currentDescriptions = serviceOrderLookup.get(serviceOrder.invoice_id) ?? []
    currentDescriptions.push(serviceOrder.description)
    serviceOrderLookup.set(serviceOrder.invoice_id, currentDescriptions)
  }

  const items = taskRows.map((task) => {
    const invoice = invoiceLookup.get(task.invoice_id) ?? null
    const client = invoice?.client_id ? clientLookup.get(invoice.client_id) ?? null : null
    const charged = task.charged ?? 0
    const paid = task.paid ?? 0

    return {
      id: task.id,
      invoice_id: task.invoice_id,
      invoice_no: invoice?.invoice_no ?? null,
      invoice_date: invoice?.date ?? null,
      invoice_status: invoice?.status ?? null,
      client_name: client?.name ?? null,
      beneficiary_name: invoice?.beneficiary_name ?? null,
      assigned_to: task.assigned_to ?? null,
      dept: task.dept ?? null,
      task: task.particulars ?? null,
      service_orders: serviceOrderLookup.get(task.invoice_id) ?? [],
      task_date: task.task_date ?? task.created_at?.slice(0, 10) ?? normalizedDate,
      status: task.status ?? null,
      payment_mode: task.payment_mode ?? null,
      ref_no: task.ref_no ?? null,
      notes: task.notes ?? null,
      charged: task.charged,
      paid: task.paid,
      difference: charged - paid,
    } satisfies DailyWorkItem
  })

  return {
    date: normalizedDate,
    data: items,
    error: null,
  }
}
