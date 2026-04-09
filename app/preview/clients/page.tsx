import ClientsPageClient from '@/app/clients/clients-page-client'
import { previewClients } from '@/lib/preview-data'

export default function PreviewClientsPage() {
  return (
    <ClientsPageClient
      initialClients={previewClients}
      initiallyOpenForm={false}
      canManage
      returnTo={null}
    />
  )
}
