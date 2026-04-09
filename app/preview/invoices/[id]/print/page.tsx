import PrintInvoiceClient from '@/app/invoices/[id]/print/print-invoice-client'
import { getPreviewClient, getPreviewInvoice, getPreviewServiceOrders } from '@/lib/preview-data'

export default async function PreviewPrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const invoice = getPreviewInvoice(id)

  return (
    <PrintInvoiceClient
      invoice={invoice}
      client={getPreviewClient(invoice.client_id)}
      serviceOrders={getPreviewServiceOrders(invoice.id)}
    />
  )
}
