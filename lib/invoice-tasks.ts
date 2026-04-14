import { supabase } from '@/lib/supabase'

type SupabaseErrorLike = {
  code?: string | null
  details?: string | null
  hint?: string | null
  message?: string | null
}

export type InvoiceTaskRecord = {
  id: string
  invoice_id: string
  service_order_id: string | null
  dept: string | null
  particulars: string | null
  assigned_to: string | null
  task_date: string | null
  charged: number | null
  paid: number | null
  payment_mode: string | null
  ref_no: string | null
  status: string | null
  notes: string | null
  created_at: string | null
}

export type InvoiceTaskMutationPayload = {
  invoice_id: string
  service_order_id?: string | null
  dept: string
  particulars: string
  assigned_to: string | null
  task_date?: string | null
  charged: number
  paid: number
  payment_mode: string | null
  ref_no: string | null
  status?: string
  notes: string | null
  created_at?: string | null
}

type QueryClient = Pick<typeof supabase, 'from'>

type TaskSelectVariant = {
  includesServiceOrderId: boolean
  includesTaskDate: boolean
  select: string
}

type TaskMutationVariant = {
  includesServiceOrderId: boolean
  includesTaskDate: boolean
}

type RawTaskRow = {
  id: string
  invoice_id: string
  service_order_id?: string | null
  dept: string | null
  particulars: string | null
  assigned_to: string | null
  task_date?: string | null
  charged: number | null
  paid: number | null
  payment_mode: string | null
  ref_no: string | null
  status: string | null
  notes: string | null
  created_at: string | null
}

const TASK_SELECT_VARIANTS: TaskSelectVariant[] = [
  {
    includesServiceOrderId: true,
    includesTaskDate: true,
    select:
      'id, invoice_id, service_order_id, dept, particulars, assigned_to, task_date, charged, paid, payment_mode, ref_no, status, notes, created_at',
  },
  {
    includesServiceOrderId: true,
    includesTaskDate: false,
    select:
      'id, invoice_id, service_order_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, created_at',
  },
  {
    includesServiceOrderId: false,
    includesTaskDate: true,
    select:
      'id, invoice_id, dept, particulars, assigned_to, task_date, charged, paid, payment_mode, ref_no, status, notes, created_at',
  },
  {
    includesServiceOrderId: false,
    includesTaskDate: false,
    select:
      'id, invoice_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, created_at',
  },
]

const TASK_MUTATION_VARIANTS: TaskMutationVariant[] = [
  { includesServiceOrderId: true, includesTaskDate: true },
  { includesServiceOrderId: true, includesTaskDate: false },
  { includesServiceOrderId: false, includesTaskDate: true },
  { includesServiceOrderId: false, includesTaskDate: false },
]

function normalizeTaskRow(row: RawTaskRow, variant: TaskSelectVariant): InvoiceTaskRecord {
  const taskDate = variant.includesTaskDate
    ? row.task_date ?? row.created_at?.slice(0, 10) ?? null
    : row.created_at?.slice(0, 10) ?? null

  return {
    id: row.id,
    invoice_id: row.invoice_id,
    service_order_id: variant.includesServiceOrderId ? row.service_order_id ?? null : null,
    dept: row.dept ?? null,
    particulars: row.particulars ?? null,
    assigned_to: row.assigned_to ?? null,
    task_date: taskDate,
    charged: row.charged ?? null,
    paid: row.paid ?? null,
    payment_mode: row.payment_mode ?? null,
    ref_no: row.ref_no ?? null,
    status: row.status ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at ?? (taskDate ? `${taskDate}T00:00:00.000Z` : null),
  }
}

function isFallbackableTaskSchemaError(error: SupabaseErrorLike | null) {
  if (!error) {
    return false
  }

  const errorText = [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST205' ||
    errorText.includes('service_order_id') ||
    errorText.includes('task_date') ||
    errorText.includes('schema cache') ||
    errorText.includes('column')
  )
}

function buildMutationPayload(
  payload: InvoiceTaskMutationPayload,
  variant: TaskMutationVariant
) {
  const nextPayload: Record<string, string | number | null> = {
    invoice_id: payload.invoice_id,
    dept: payload.dept,
    particulars: payload.particulars,
    assigned_to: payload.assigned_to,
    charged: payload.charged,
    paid: payload.paid,
    payment_mode: payload.payment_mode,
    ref_no: payload.ref_no,
    status: payload.status ?? 'Pending',
    notes: payload.notes,
  }

  if ('created_at' in payload && payload.created_at !== undefined) {
    nextPayload.created_at = payload.created_at
  }

  if (variant.includesServiceOrderId && 'service_order_id' in payload) {
    nextPayload.service_order_id = payload.service_order_id ?? null
  }

  if (variant.includesTaskDate && 'task_date' in payload && payload.task_date !== undefined) {
    nextPayload.task_date = payload.task_date
  }

  return nextPayload
}

async function selectTasksWithFallback(
  runQuery: (select: string) => Promise<{ data: unknown[] | null; error: SupabaseErrorLike | null }>
) {
  let lastError: SupabaseErrorLike | null = null

  for (const variant of TASK_SELECT_VARIANTS) {
    const result = await runQuery(variant.select)

    if (!result.error) {
      return {
        data: (result.data ?? []).map((row) => normalizeTaskRow(row as RawTaskRow, variant)),
        error: null,
      }
    }

    if (!isFallbackableTaskSchemaError(result.error)) {
      return { data: null, error: result.error }
    }

    lastError = result.error
  }

  return { data: null, error: lastError }
}

async function selectTaskById(taskId: string, queryClient: QueryClient) {
  let lastError: SupabaseErrorLike | null = null

  for (const variant of TASK_SELECT_VARIANTS) {
    const result = await queryClient
      .from('invoice_tasks')
      .select(variant.select)
      .eq('id', taskId)
      .single()

    if (!result.error && result.data) {
      return {
        data: normalizeTaskRow(result.data as unknown as RawTaskRow, variant),
        error: null,
      }
    }

    if (!isFallbackableTaskSchemaError(result.error)) {
      return { data: null, error: result.error }
    }

    lastError = result.error
  }

  return { data: null, error: lastError }
}

export async function selectInvoiceTasks(invoiceId: string, queryClient: QueryClient = supabase) {
  return selectTasksWithFallback(async (select) =>
    await queryClient
      .from('invoice_tasks')
      .select(select)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true })
  )
}

export async function selectAllInvoiceTasks(queryClient: QueryClient = supabase) {
  return selectTasksWithFallback(async (select) =>
    await queryClient
      .from('invoice_tasks')
      .select(select)
      .order('created_at', { ascending: true })
  )
}

export async function saveInvoiceTask(
  payload: InvoiceTaskMutationPayload,
  queryClient: QueryClient = supabase,
  taskId?: string | null
) {
  let lastError: SupabaseErrorLike | null = null

  for (const variant of TASK_MUTATION_VARIANTS) {
    const nextPayload = buildMutationPayload(payload, variant)
    const mutation = taskId
      ? queryClient.from('invoice_tasks').update(nextPayload).eq('id', taskId)
      : queryClient.from('invoice_tasks').insert(nextPayload)

    const mutationResult = await mutation.select('id').single()

    if (!mutationResult.error && mutationResult.data?.id) {
      return selectTaskById(mutationResult.data.id as string, queryClient)
    }

    if (!isFallbackableTaskSchemaError(mutationResult.error)) {
      return { data: null, error: mutationResult.error }
    }

    lastError = mutationResult.error
  }

  return { data: null, error: lastError }
}
