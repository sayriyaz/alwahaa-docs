import { getDailyWorks, normalizeDailyWorksDate } from '@/lib/daily-works'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import DailyWorksPageClient from './daily-works-page-client'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function DailyWorksPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { appUser, db } = await requireAuthenticatedAppUser()
  const resolvedSearchParams = await searchParams
  const selectedDate = normalizeDailyWorksDate(getSearchParam(resolvedSearchParams.date) ?? null)
  const selectedAssignee = getSearchParam(resolvedSearchParams.assignee)?.trim() ?? ''
  const selectedDepartment = getSearchParam(resolvedSearchParams.dept)?.trim() ?? ''
  const result = await getDailyWorks(selectedDate, db)
  const currentUserLabel = appUser.full_name?.trim() || appUser.email
  const reviewedByLabel = appUser.role === 'admin' ? currentUserLabel : 'Pending review'

  return (
    <DailyWorksPageClient
      initialDate={result.date}
      initialItems={result.data}
      initialAssigneeFilter={selectedAssignee}
      initialDepartmentFilter={selectedDepartment}
      preparedByLabel={currentUserLabel}
      reviewedByLabel={reviewedByLabel}
    />
  )
}
