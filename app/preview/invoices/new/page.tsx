import NewInvoicePageClient from '@/app/invoices/new/new-invoice-page-client'
import { previewAssignableUsers, previewClients, previewAppUser } from '@/lib/preview-data'

export default function PreviewNewInvoicePage() {
  return (
    <NewInvoicePageClient
      initialClients={previewClients}
      preselectedClientId={previewClients[0].id}
      assignableUsers={previewAssignableUsers}
      currentAssigneeLabel={previewAppUser.full_name}
    />
  )
}
