import { supabase } from '@/lib/supabase'

export type InvoiceTaskRecord = {
  id: string
  invoice_id: string
  service_order_id: string | null
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
  service_order_id?: string | null
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

export type ServiceOrderTaskSyncInput = {
  amount: number | null
  description: string
  id: string
  invoice_id: string
}

function isMissingTaskDateColumn(error: SupabaseErrorLike | null) {
  if (!error) {
    return false
  }

  const message = [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase()
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    message.includes('task_date')
  )
}

function normalizeTaskRecord(
  task: Omit<InvoiceTaskRecord, 'service_order_id' | 'task_date'> & {
    service_order_id?: string | null
    task_date?: string | null
  }
): InvoiceTaskRecord {
  return {
    ...task,
    service_order_id: task.service_order_id ?? null,
    task_date: task.task_date ?? null,
  }
}

function getTaskSyncMessage() {
  return 'Automatic task sync needs the service-order task link migration. Run supabase/migrate-invoice-task-links.sql and try again.'
}

function buildTaskSignature(particulars: string | null, charged: number | null) {
  return `${(particulars ?? '').trim().toLowerCase()}::${(charged ?? 0).toFixed(2)}`
}

export async function selectInvoiceTasks(invoiceId: string, queryClient: QueryClient = supabase) {
  const primaryResult = await queryClient
    .from('invoice_tasks')
    .select(TASK_SELECT.replace('id, invoice_id,', 'id, invoice_id, service_order_id,'))
    .eq('invoice_id', invoiceId)
    .order('task_date', { ascending: true, nullsFirst: false })
    .order('created_at')

  if (!primaryResult.error || !isMissingTaskDateColumn(primaryResult.error)) {
    return {
      ...primaryResult,
      data: ((primaryResult.data ?? []) as unknown as InvoiceTaskRecord[]).map(normalizeTaskRecord),
    }
  }

  const legacyResult = await queryClient
    .from('invoice_tasks')
    .select(LEGACY_TASK_SELECT)
    .eq('invoice_id', invoiceId)
    .order('created_at')

  return {
    ...legacyResult,
    data: ((legacyResult.data ?? []) as unknown as Array<Omit<InvoiceTaskRecord, 'service_order_id' | 'task_date'>>).map(normalizeTaskRecord),
  }
}

export async function selectAllInvoiceTasks(queryClient: QueryClient = supabase) {
  const primaryResult = await queryClient
    .from('invoice_tasks')
    .select(TASK_SELECT.replace('id, invoice_id,', 'id, invoice_id, service_order_id,'))
    .order('task_date', { ascending: true, nullsFirst: false })
    .order('created_at')

  if (!primaryResult.error || !isMissingTaskDateColumn(primaryResult.error)) {
    return {
      ...primaryResult,
      data: ((primaryResult.data ?? []) as unknown as InvoiceTaskRecord[]).map(normalizeTaskRecord),
    }
  }

  const legacyResult = await queryClient
    .from('invoice_tasks')
    .select(LEGACY_TASK_SELECT)
    .order('created_at')

  return {
    ...legacyResult,
    data: ((legacyResult.data ?? []) as unknown as Array<Omit<InvoiceTaskRecord, 'service_order_id' | 'task_date'>>).map(normalizeTaskRecord),
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

  const primaryResult = await primaryQuery
    .select(TASK_SELECT.replace('id, invoice_id,', 'id, invoice_id, service_order_id,'))
    .single()

  if (!primaryResult.error || !isMissingTaskDateColumn(primaryResult.error)) {
    return {
      ...primaryResult,
      data: primaryResult.data ? normalizeTaskRecord(primaryResult.data as unknown as InvoiceTaskRecord) : primaryResult.data,
    }
  }

  const legacyQuery = taskId
    ? queryClient.from('invoice_tasks').update(legacyPayload).eq('id', taskId)
    : queryClient.from('invoice_tasks').insert(legacyPayload)

  const legacyResult = await legacyQuery.select(LEGACY_TASK_SELECT).single()

  return {
    ...legacyResult,
    data: legacyResult.data
      ? normalizeTaskRecord(legacyResult.data as unknown as Omit<InvoiceTaskRecord, 'service_order_id' | 'task_date'>)
      : legacyResult.data,
  }
}

export async function syncInvoiceTasksFromServiceOrders(
  invoiceId: string,
  serviceOrders: ServiceOrderTaskSyncInput[],
  queryClient: QueryClient = supabase
) {
  const existingTasksResult = await queryClient
    .from('invoice_tasks')
    .select(TASK_SELECT.replace('id, invoice_id,', 'id, invoice_id, service_order_id,'))
    .eq('invoice_id', invoiceId)

  if (existingTasksResult.error) {
    if (isMissingTaskDateColumn(existingTasksResult.error)) {
      return {
        data: null,
        error: {
          message: getTaskSyncMessage(),
        },
      }
    }

    return {
      data: null,
      error: existingTasksResult.error,
    }
  }

  const existingTasks = ((existingTasksResult.data ?? []) as unknown as InvoiceTaskRecord[]).map(normalizeTaskRecord)
  const linkedTasks = new Map(
    existingTasks
      .filter((task) => task.service_order_id)
      .map((task) => [task.service_order_id as string, task] as const)
  )
  const unlinkedTasksBySignature = new Map<string, InvoiceTaskRecord[]>()

  for (const existingTask of existingTasks) {
    if (existingTask.service_order_id) {
      continue
    }

    const signature = buildTaskSignature(existingTask.particulars, existingTask.charged)
    const matchingTasks = unlinkedTasksBySignature.get(signature) ?? []
    matchingTasks.push(existingTask)
    unlinkedTasksBySignature.set(signature, matchingTasks)
  }

  const keepTaskIds = new Set<string>()
  const serviceOrderIds = new Set(serviceOrders.map((serviceOrder) => serviceOrder.id))

  for (const serviceOrder of serviceOrders) {
    const linkedTask = linkedTasks.get(serviceOrder.id)
    const signature = buildTaskSignature(serviceOrder.description, serviceOrder.amount)
    const matchingUnlinkedTasks = unlinkedTasksBySignature.get(signature) ?? []
    const fallbackTask = matchingUnlinkedTasks.shift() ?? null

    if (matchingUnlinkedTasks.length === 0) {
      unlinkedTasksBySignature.delete(signature)
    } else {
      unlinkedTasksBySignature.set(signature, matchingUnlinkedTasks)
    }

    const basePayload = {
      charged: serviceOrder.amount ?? 0,
      invoice_id: invoiceId,
      particulars: serviceOrder.description,
      service_order_id: serviceOrder.id,
    }

    if (linkedTask) {
      keepTaskIds.add(linkedTask.id)

      const { error } = await queryClient
        .from('invoice_tasks')
        .update(basePayload)
        .eq('id', linkedTask.id)

      if (error) {
        return {
          data: null,
          error,
        }
      }

      continue
    }

    if (fallbackTask) {
      keepTaskIds.add(fallbackTask.id)

      const { error } = await queryClient
        .from('invoice_tasks')
        .update(basePayload)
        .eq('id', fallbackTask.id)

      if (error) {
        return {
          data: null,
          error,
        }
      }

      continue
    }

    const { data, error } = await queryClient
      .from('invoice_tasks')
      .insert({
        assigned_to: null,
        charged: serviceOrder.amount ?? 0,
        dept: null,
        invoice_id: invoiceId,
        notes: null,
        paid: null,
        particulars: serviceOrder.description,
        payment_mode: null,
        ref_no: null,
        service_order_id: serviceOrder.id,
        status: 'Pending',
        task_date: null,
      })
      .select('id')
      .single()

    if (error || !data) {
      return {
        data: null,
        error,
      }
    }

    keepTaskIds.add(data.id as string)
  }

  const tasksToDelete = existingTasks.filter(
    (task) => task.service_order_id && !serviceOrderIds.has(task.service_order_id)
  )

  for (const taskToDelete of tasksToDelete) {
    const { error } = await queryClient
      .from('invoice_tasks')
      .delete()
      .eq('id', taskToDelete.id)

    if (error) {
      return {
        data: null,
        error,
      }
    }
  }

  const refreshedTasksResult = await selectInvoiceTasks(invoiceId, queryClient)

  return {
    data: (refreshedTasksResult.data ?? []) as unknown as InvoiceTaskRecord[],
    error: refreshedTasksResult.error,
  }
}
