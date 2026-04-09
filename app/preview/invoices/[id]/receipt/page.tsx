import PrintReceiptClient from '@/app/invoices/[id]/receipt/print-receipt-client'
import { getPreviewClient, getPreviewInvoice, getPreviewReceipts } from '@/lib/preview-data'

export default async function PreviewPrintReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const invoice = getPreviewInvoice(id)

  return (
    <PrintReceiptClient
      invoice={invoice}
      client={getPreviewClient(invoice.client_id)}
      receipts={getPreviewReceipts(invoice.id)}
    />
  )
}
