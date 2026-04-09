import { supabase } from '@/lib/supabase'

export type InvoiceTaskRecord = {
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
  task_date: string | null
  created_at: string | null
}

export type InvoiceTaskMutationPayload = {
  invoice_id: string
  dept: string
  particulars: string
  assigned_to: string | null
  charged: number
  paid: number
  payment_mode: string | null
  ref_no: string | null
  status?: string
  notes: string | null
  task_date: string | null
}

type SupabaseErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

type QueryClient = Pick<typeof supabase, 'from'>

const TASK_SELECT = 'id, invoice_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, task_date, created_at'
const LEGACY_TASK_SELECT = 'id, invoice_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, created_at'

function isMissingTaskDateColumn(error: SupabaseErrorLike | null) {
  if (!error) {
    return false
  }

  const message = [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase()
  return error.code === 'PGRST204' || error.code === '42703' || message.includes('task_date')
}

function normalizeTaskRecord(task: Omit<InvoiceTaskRecord, 'task_date'> & { task_date?: string | null }): InvoiceTaskRecord {
  return {
    ...task,
    task_date: task.task_date ?? null,
  }
}

export async function selectInvoiceTasks(invoiceId: string, queryClient: QueryClient = supabase) {
  const primaryResult = await queryClient
    .from('invoice_tasks')
    .select(TASK_SELECT)
    .eq('invoice_id', invoiceId)
    .order('task_date', { ascending: true, nullsFirst: false })
    .order('created_at')

  if (!primaryResult.error || !isMissingTaskDateColumn(primaryResult.error)) {
    return {
      ...primaryResult,
      data: ((primaryResult.data ?? []) as InvoiceTaskRecord[]).map(normalizeTaskRecord),
    }
  }

  const legacyResult = await queryClient
    .from('invoice_tasks')
    .select(LEGACY_TASK_SELECT)
    .eq('invoice_id', invoiceId)
    .order('created_at')

  return {
    ...legacyResult,
    data: ((legacyResult.data ?? []) as Array<Omit<InvoiceTaskRecord, 'task_date'>>).map(normalizeTaskRecord),
  }
}

export async function selectAllInvoiceTasks(queryClient: QueryClient = supabase) {
  const primaryResult = await queryClient
    .from('invoice_tasks')
    .select(TASK_SELECT)
    .order('task_date', { ascending: true, nullsFirst: false })
    .order('created_at')

  if (!primaryResult.error || !isMissingTaskDateColumn(primaryResult.error)) {
    return {
      ...primaryResult,
      data: ((primaryResult.data ?? []) as InvoiceTaskRecord[]).map(normalizeTaskRecord),
    }
  }

  const legacyResult = await queryClient
    .from('invoice_tasks')
    .select(LEGACY_TASK_SELECT)
    .order('created_at')

  return {
    ...legacyResult,
    data: ((legacyResult.data ?? []) as Array<Omit<InvoiceTaskRecord, 'task_date'>>).map(normalizeTaskRecord),
  }
}

export async function saveInvoiceTask(
  payload: InvoiceTaskMutationPayload,
  queryClient: QueryClient = supabase,
  taskId?: string | null
) {
  const legacyPayload = {
    invoice_id: payload.invoice_id,
    dept: payload.dept,
    particulars: payload.particulars,
    assigned_to: payload.assigned_to,
    charged: payload.charged,
    paid: payload.paid,
    payment_mode: payload.payment_mode,
    ref_no: payload.ref_no,
    status: payload.status,
    notes: payload.notes,
  }

  const primaryQuery = taskId
    ? queryClient.from('invoice_tasks').update(payload).eq('id', taskId)
    : queryClient.from('invoice_tasks').insert(payload)

  const primaryResult = await primaryQuery.select(TASK_SELECT).single()

  if (!primaryResult.error || !isMissingTaskDateColumn(primaryResult.error)) {
    return {
      ...primaryResult,
      data: primaryResult.data ? normalizeTaskRecord(primaryResult.data as InvoiceTaskRecord) : primaryResult.data,
    }
  }

  const legacyQuery = taskId
    ? queryClient.from('invoice_tasks').update(legacyPayload).eq('id', taskId)
    : queryClient.from('invoice_tasks').insert(legacyPayload)

  const legacyResult = await legacyQuery.select(LEGACY_TASK_SELECT).single()

  return {
    ...legacyResult,
    data: legacyResult.data
      ? normalizeTaskRecord(legacyResult.data as Omit<InvoiceTaskRecord, 'task_date'>)
      : legacyResult.data,
  }
}
