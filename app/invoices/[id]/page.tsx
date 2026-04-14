import Link from 'next/link'
import { getUserPermissions, requireAuthenticatedAppUser } from '@/lib/auth'
import { getAssignableUsers, type AssignableUser } from '@/lib/app-users'
import { selectInvoiceTasks } from '@/lib/invoice-tasks'
import { selectServiceOrders } from '@/lib/service-orders'
import AppBrandLink from '@/components/app-brand-link'
import InvoiceDetailClient, {
  type ClientDetails,
  type ClientOption,
  type Invoice,
  type InvoiceReceipt,
  type InvoiceTask,
  type ServiceOrder,
} from './invoice-detail-client'

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getUserPermissions(appUser.role)
  const { id } = await params

  const { data: invoiceData, error: invoiceError } = await db
    .from('invoices')
    .select('id, client_id, invoice_no, date, beneficiary_name, assigned_to, processing_fee, vat_amount, total_amount, status, notes')
    .eq('id', id)
    .single()

  if (invoiceError || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <AppBrandLink compact />
              <div className="hidden h-10 w-px bg-gray-200 md:block" />
              <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
            </div>
            {permissions.canCreateInvoices ? (
              <Link href="/invoices/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                + New Invoice
              </Link>
            ) : null}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="rounded-xl border bg-white p-6">
            <h1 className="text-xl font-semibold text-gray-900">Invoice unavailable</h1>
            <p className="mt-2 text-sm text-gray-500">We could not load that invoice.</p>
          </div>
        </div>
      </div>
    )
  }

  const invoice = invoiceData as Invoice

  const [{ data: serviceOrderData }, { data: taskData, error: taskError }, { data: receiptData }, assignableUsers, clientsResult] = await Promise.all([
    selectServiceOrders(id, db),
    selectInvoiceTasks(id, db),
    db
      .from('invoice_receipts')
      .select('id, invoice_id, receipt_no, amount, payment_mode, date, notes, created_at')
      .eq('invoice_id', id)
      .order('date'),
    getAssignableUsers(db),
    db
      .from('clients')
      .select('id, name, contact_person, phone, email')
      .order('name'),
  ])

  if (taskError) {
    console.error('[invoice tasks] fetch error for invoice', id, taskError)
  }

  let client: ClientDetails | null = null
  if (invoice.client_id) {
    const { data: clientData } = await db
      .from('clients')
      .select('id, name, contact_person, phone, email')
      .eq('id', invoice.client_id)
      .maybeSingle()

    client = (clientData ?? null) as ClientDetails | null
  }

  return (
    <InvoiceDetailClient
      invoice={invoice}
      client={client}
      clients={(clientsResult.data ?? []) as ClientOption[]}
      serviceOrders={(serviceOrderData ?? []) as ServiceOrder[]}
      tasks={(taskData ?? []) as InvoiceTask[]}
      receipts={(receiptData ?? []) as InvoiceReceipt[]}
      permissions={permissions}
      roleLabel={appUser.role}
      assignableUsers={assignableUsers as AssignableUser[]}
    />
  )
}
