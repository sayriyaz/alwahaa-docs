import InvoiceDetailClient from '@/app/invoices/[id]/invoice-detail-client'
import { getUserPermissions } from '@/lib/auth'
import {
  getPreviewClient,
  getPreviewInvoice,
  getPreviewReceipts,
  getPreviewServiceOrders,
  getPreviewTasks,
  previewAssignableUsers,
  previewClients,
} from '@/lib/preview-data'

export default async function PreviewInvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const invoice = getPreviewInvoice(id)
  const client = getPreviewClient(invoice.client_id)

  return (
    <InvoiceDetailClient
      invoice={invoice}
      client={client}
      clients={previewClients}
      serviceOrders={getPreviewServiceOrders(invoice.id)}
      tasks={getPreviewTasks(invoice.id)}
      receipts={getPreviewReceipts(invoice.id)}
      permissions={getUserPermissions('admin')}
      roleLabel="admin"
      assignableUsers={previewAssignableUsers}
    />
  )
}
