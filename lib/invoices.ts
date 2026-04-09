import { supabase } from '@/lib/supabase'
import { calculateInvoiceTotalAmount } from '@/lib/invoice-calculations'
import { selectServiceOrdersByInvoiceIds } from '@/lib/service-orders'

export type InvoiceSummary = {
  id: string
  invoice_no: string
  client_id: string | null
  date: string | null
  assigned_to: string | null
  total_amount: number | null
  status: string | null
  notes: string | null
  created_at: string | null
}

type InvoiceRecord = InvoiceSummary & {
  processing_fee: number | null
}

type ClientRecord = {
  id: string
  name: string
}

type QueryClient = Pick<typeof supabase, 'from'>

export async function getInvoices(queryClient: QueryClient = supabase, limit?: number) {
  let query = queryClient
    .from('invoices')
    .select('id, invoice_no, client_id, date, assigned_to, processing_fee, total_amount, status, notes, created_at')
    .order('created_at', { ascending: false })

  if (typeof limit === 'number') {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) {
    return [] as InvoiceSummary[]
  }

  const invoices = (data ?? []) as InvoiceRecord[]

  if (invoices.length === 0) {
    return [] as InvoiceSummary[]
  }

  const serviceOrderTotals = new Map<string, number>()
  const invoiceIds = invoices.map((invoice) => invoice.id)
  const serviceOrdersResult = await selectServiceOrdersByInvoiceIds(invoiceIds, queryClient)
  const serviceOrderRows = (serviceOrdersResult.data ?? []) as Array<{
    amount: number | null
    invoice_id: string
  }>
  const serviceOrderRowsByInvoiceId = new Map<string, Array<{ amount: number | null }>>()

  for (const serviceOrder of serviceOrderRows) {
    const existingRows = serviceOrderRowsByInvoiceId.get(serviceOrder.invoice_id) ?? []
    existingRows.push({ amount: serviceOrder.amount })
    serviceOrderRowsByInvoiceId.set(serviceOrder.invoice_id, existingRows)
  }

  for (const invoice of invoices) {
    serviceOrderTotals.set(
      invoice.id,
      calculateInvoiceTotalAmount(
        serviceOrderRowsByInvoiceId.get(invoice.id) ?? [],
        invoice.processing_fee ?? 0
      )
    )
  }

  return invoices.map((invoice) => ({
    id: invoice.id,
    invoice_no: invoice.invoice_no,
    client_id: invoice.client_id,
    date: invoice.date,
    assigned_to: invoice.assigned_to,
    total_amount: serviceOrderTotals.get(invoice.id) ?? invoice.total_amount,
    status: invoice.status,
    notes: invoice.notes,
    created_at: invoice.created_at,
  }))
}

export async function getClientNameMap(queryClient: QueryClient = supabase) {
  const { data, error } = await queryClient.from('clients').select('id, name')
  if (error) {
    return new Map<string, string>()
  }

  return new Map(
    ((data ?? []) as ClientRecord[]).map((client) => [client.id, client.name] as const)
  )
}
