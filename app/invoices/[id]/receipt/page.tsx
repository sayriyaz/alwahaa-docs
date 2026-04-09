import Link from 'next/link'
import { getUserPermissions, requireAuthenticatedAppUser } from '@/lib/auth'
import PrintReceiptClient from './print-receipt-client'
import type { ClientDetails, Invoice, InvoiceReceipt } from '../invoice-detail-client'

export default async function PrintReceiptPage({
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
        <div className="flex items-center justify-between border-b bg-white px-6 py-4">
          <Link href="/invoices" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
          {permissions.canCreateInvoices ? (
            <Link href="/invoices/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + New Invoice
            </Link>
          ) : null}
        </div>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-xl border bg-white p-6">
            <h1 className="text-xl font-semibold text-gray-900">Receipt unavailable</h1>
            <p className="mt-2 text-sm text-gray-500">We could not load that invoice receipt.</p>
          </div>
        </div>
      </div>
    )
  }

  const invoice = invoiceData as Invoice

  const { data: receiptData } = await db
    .from('invoice_receipts')
    .select('id, invoice_id, receipt_no, amount, payment_mode, date, notes, created_at')
    .eq('invoice_id', id)
    .order('date')

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
    <PrintReceiptClient
      invoice={invoice}
      client={client}
      receipts={(receiptData ?? []) as InvoiceReceipt[]}
    />
  )
}
