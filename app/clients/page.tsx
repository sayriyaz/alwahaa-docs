import { getUserPermissions, requireAuthenticatedAppUser } from '@/lib/auth'
import ClientsPageClient from './clients-page-client'

type Client = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  trn: string | null
  address: string | null
  emirate: string | null
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const permissions = getUserPermissions(appUser.role)
  const resolvedSearchParams = await searchParams
  const shouldOpenForm = getSearchParam(resolvedSearchParams.new) === '1'
  const returnTo = getSearchParam(resolvedSearchParams.returnTo)

  const { data } = await db
    .from('clients')
    .select('*')
    .order('name')

  return (
    <ClientsPageClient
      initialClients={(data ?? []) as Client[]}
      initiallyOpenForm={permissions.canManageClients ? shouldOpenForm : false}
      canManage={permissions.canManageClients}
      returnTo={returnTo?.startsWith('/') ? returnTo : null}
    />
  )
}
