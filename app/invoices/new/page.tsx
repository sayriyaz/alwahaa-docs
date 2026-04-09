import { requireAuthenticatedAppUser } from '@/lib/auth'
import { getAssignableUsers, type AssignableUser } from '@/lib/app-users'
import NewInvoicePageClient from './new-invoice-page-client'

type ClientSummary = {
  id: string
  name: string
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin', 'accountant'])
  const resolvedSearchParams = await searchParams
  const preselectedClientId = getSearchParam(resolvedSearchParams.clientId) ?? null

  const [{ data }, assignableUsers] = await Promise.all([
    db
      .from('clients')
      .select('id, name')
      .order('name'),
    getAssignableUsers(db),
  ])

  return (
    <NewInvoicePageClient
      initialClients={(data ?? []) as ClientSummary[]}
      preselectedClientId={preselectedClientId}
      assignableUsers={assignableUsers as AssignableUser[]}
      currentAssigneeLabel={appUser.full_name || appUser.email}
    />
  )
}
