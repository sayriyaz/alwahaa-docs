import { getAuthenticatedAppUser } from '@/lib/auth'
import {
  getDailyAttendance,
  normalizeAttendanceDate,
} from '@/lib/biometric-attendance'
import {
  getTrackedAttendanceDownloadUids,
  matchTrackedAttendanceStaff,
  buildDailyAttendanceRoster,
} from '@/lib/attendance-staff'

export const runtime = 'nodejs'

export async function GET() {
  const authenticatedUser = await getAuthenticatedAppUser()

  if (!authenticatedUser?.appUser) {
    return Response.json({ statusCode: null })
  }

  try {
    const { db, appUser } = authenticatedUser
    const today = normalizeAttendanceDate(null)
    const downloadUids = getTrackedAttendanceDownloadUids()

    const { data: appUsers } = await db
      .from('app_users')
      .select('id, email, full_name, role')
      .order('full_name')

    const trackedStaff = matchTrackedAttendanceStaff(
      (appUsers ?? []) as Parameters<typeof matchTrackedAttendanceStaff>[0]
    )

    const myStaff = trackedStaff.find((s) => s.appUserId === appUser.id)
    if (!myStaff) {
      return Response.json({ statusCode: null })
    }

    const dailyResult = await getDailyAttendance(today, { downloadUids })
    const roster = buildDailyAttendanceRoster({
      date: today,
      dailyAttendance: dailyResult,
      trackedStaff: [myStaff],
    })

    const statusCode = roster[0]?.status.code ?? null
    return Response.json({ statusCode })
  } catch {
    return Response.json({ statusCode: null })
  }
}
