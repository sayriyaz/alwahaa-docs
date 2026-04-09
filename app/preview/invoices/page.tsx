import Link from 'next/link'
import AppBrandLink from '@/components/app-brand-link'
import { previewClients, previewInvoices } from '@/lib/preview-data'

function formatCurrency(amount: number | null) {
  return `AED ${(amount ?? 0).toFixed(2)}`
}

function getStatusClasses(status: string | null) {
  switch (status) {
    case 'Active':
      return 'bg-green-50 text-green-700'
    case 'Completed':
      return 'bg-blue-50 text-blue-700'
    case 'Partial':
      return 'bg-amber-50 text-amber-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const clientNames = new Map(previewClients.map((client) => [client.id, client.name] as const))

export default function PreviewInvoicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <AppBrandLink compact />
            <div className="hidden h-10 w-px bg-gray-200 md:block" />
            <Link href="/preview" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
              <p className="text-sm text-gray-500">{previewInvoices.length} invoices total</p>
            </div>
          </div>
          <Link href="/preview/invoices/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Invoice
          </Link>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Invoice No</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Assigned To</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {previewInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-700">
                    <Link href={`/preview/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.invoice_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{clientNames.get(invoice.client_id ?? '') ?? 'Unknown client'}</td>
                  <td className="px-4 py-3 text-gray-600">{invoice.date || 'Not set'}</td>
                  <td className="px-4 py-3 text-gray-600">{invoice.assigned_to || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(invoice.status)}`}>
                      {invoice.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
