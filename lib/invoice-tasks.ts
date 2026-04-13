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
  created_at?: string | null
}

type QueryClient = Pick<typeof supabase, 'from'>

const TASK_SELECT = 'id, invoice_id, service_order_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, created_at'

export type ServiceOrderTaskSyncInput = {
  amount: number | null
  description: string
  id: string
  invoice_id: string
}

function buildTaskSignature(particulars: string | null, charged: number | null) {
  return `${(particulars ?? '').trim().toLowerCase()}::${(charged ?? 0).toFixed(2)}`
}

export async function selectInvoiceTasks(invoiceId: string, queryClient: QueryClient = supabase) {
  return queryClient
    .from('invoice_tasks')
    .select(TASK_SELECT)
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true })
}

export async function selectAllInvoiceTasks(queryClient: QueryClient = supabase) {
  return queryClient
    .from('invoice_tasks')
    .select(TASK_SELECT)
    .order('created_at', { ascending: true })
}

export async function saveInvoiceTask(
  payload: InvoiceTaskMutationPayload,
  queryClient: QueryClient = supabase,
  taskId?: string | null
) {
  const query = taskId
    ? queryClient.from('invoice_tasks').update(payload).eq('id', taskId)
    : queryClient.from('invoice_tasks').insert(payload)

  return query.select(TASK_SELECT).single()
}
