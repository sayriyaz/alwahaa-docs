import { redirect } from 'next/navigation'
import { getAuthenticatedAppUser } from '@/lib/auth'
import LoginForm from './login-form'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await searchParams
  const nextPath = getSearchParam(resolvedSearchParams.next)
  const safeNextPath = nextPath?.startsWith('/') ? nextPath : '/'
  const authenticatedUser = await getAuthenticatedAppUser()

  if (authenticatedUser) {
    if (!authenticatedUser.appUser) {
      redirect('/access-denied')
    }
    redirect(safeNextPath)
  }

  return <LoginForm nextPath={safeNextPath} />
}
