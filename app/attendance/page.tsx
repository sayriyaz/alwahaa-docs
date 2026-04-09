import { requireAuthenticatedAppUser } from '@/lib/auth'
import {
  getDailyAttendance,
  getMonthlyAttendance,
  normalizeAttendanceDate,
  normalizeAttendanceMonth,
} from '@/lib/biometric-attendance'
import { getTrackedAttendanceDownloadUids, matchTrackedAttendanceStaff } from '@/lib/attendance-staff'
import AttendancePageClient from './attendance-page-client'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export const runtime = 'nodejs'

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { db } = await requireAuthenticatedAppUser(['admin'])
  const resolvedSearchParams = await searchParams
  const requestedView = getSearchParam(resolvedSearchParams.view) === 'monthly' ? 'monthly' : 'daily'
  const selectedDate = normalizeAttendanceDate(getSearchParam(resolvedSearchParams.date))
  const selectedMonth = normalizeAttendanceMonth(getSearchParam(resolvedSearchParams.month))
  const trackedDownloadUids = getTrackedAttendanceDownloadUids()
  const { data: appUsers } = await db.from('app_users').select('id, email, full_name, role').order('full_name')
  const trackedStaff = matchTrackedAttendanceStaff((appUsers ?? []) as Parameters<typeof matchTrackedAttendanceStaff>[0])

  let initialError = ''
  let initialDailyData = null
  let initialMonthlyData = null

  try {
    if (requestedView === 'monthly') {
      initialMonthlyData = await getMonthlyAttendance(selectedMonth, {
        downloadUids: trackedDownloadUids,
      })
    } else {
      initialDailyData = await getDailyAttendance(selectedDate, {
        downloadUids: trackedDownloadUids,
      })
    }
  } catch (error) {
    initialError = error instanceof Error ? error.message : 'Unable to load attendance data right now.'
  }

  return (
    <AttendancePageClient
      initialDate={selectedDate}
      initialDailyData={initialDailyData}
      initialError={initialError}
      initialMonth={selectedMonth}
      initialMonthlyData={initialMonthlyData}
      initialView={requestedView}
      trackedStaff={trackedStaff}
    />
  )
}
