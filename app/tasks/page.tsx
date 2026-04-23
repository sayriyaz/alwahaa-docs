import { requireAuthenticatedAppUser } from '@/lib/auth'
import { selectAllInvoiceTasks, type InvoiceTaskRecord } from '@/lib/invoice-tasks'
import { getClientNameMap, getInvoices } from '@/lib/invoices'
import TasksPageClient from './tasks-page-client'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

export type EnrichedTask = InvoiceTaskRecord & {
  invoiceNo: string | null
  clientName: string | null
}

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const { db } = await requireAuthenticatedAppUser()

  const [tasksResult, invoices, clientNames] = await Promise.all([
    selectAllInvoiceTasks(db),
    getInvoices(db),
    getClientNameMap(db),
  ])

  const tasks = (tasksResult.data ?? []) as InvoiceTaskRecord[]

  // invoice_id → { invoiceNo, clientName }
  const invoiceMap = new Map(
    invoices.map((inv) => [
      inv.id,
      {
        invoiceNo: inv.invoice_no,
        clientName: inv.client_id ? (clientNames.get(inv.client_id) ?? null) : null,
      },
    ])
  )

  const enriched: EnrichedTask[] = tasks.map((t) => ({
    ...t,
    invoiceNo: invoiceMap.get(t.invoice_id)?.invoiceNo ?? null,
    clientName: invoiceMap.get(t.invoice_id)?.clientName ?? null,
  }))

  const resolved = await searchParams
  const initialAssignee = getParam(resolved.assignee)?.trim() ?? ''
  const initialStatus = getParam(resolved.status)?.trim() ?? ''
  const initialDept = getParam(resolved.dept)?.trim() ?? ''

  return (
    <TasksPageClient
      tasks={enriched}
      initialAssignee={initialAssignee}
      initialStatus={initialStatus}
      initialDept={initialDept}
    />
  )
}
