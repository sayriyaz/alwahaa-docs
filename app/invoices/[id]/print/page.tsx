import Link from 'next/link'
import { getUserPermissions, requireAuthenticatedAppUser } from '@/lib/auth'
import { selectServiceOrders } from '@/lib/service-orders'
import type { Invoice, ServiceOrder } from '../invoice-detail-client'
import PrintInvoiceClient, { type PrintClientDetails } from './print-invoice-client'

export default async function PrintInvoicePage({
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
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <Link href="/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
          {permissions.canCreateInvoices ? (
            <Link href="/invoices/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + New Invoice
            </Link>
          ) : null}
        </div>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="rounded-xl border bg-white p-6">
            <h1 className="text-xl font-semibold text-gray-900">Invoice unavailable</h1>
            <p className="mt-2 text-sm text-gray-500">We could not load that invoice for printing.</p>
          </div>
        </div>
      </div>
    )
  }

  const invoice = invoiceData as Invoice
  const { data: serviceOrderData } = await selectServiceOrders(id, db)

  let client: PrintClientDetails | null = null
  if (invoice.client_id) {
    const { data: clientData } = await db
      .from('clients')
      .select('id, name, contact_person, phone, email, trn, emirate')
      .eq('id', invoice.client_id)
      .maybeSingle()

    client = (clientData ?? null) as PrintClientDetails | null
  }

  return (
    <PrintInvoiceClient
      invoice={invoice}
      client={client}
      serviceOrders={(serviceOrderData ?? []) as ServiceOrder[]}
    />
  )
}
