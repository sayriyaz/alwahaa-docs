import type { NextRequest } from 'next/server'
import { getAuthenticatedAppUser } from '@/lib/auth'
import {
  getDailyAttendance,
  getMonthlyAttendance,
  normalizeAttendanceDate,
  normalizeAttendanceMonth,
} from '@/lib/biometric-attendance'
import { getTrackedAttendanceDownloadUids } from '@/lib/attendance-staff'
import { attendanceQuerySchema } from '@/lib/validation'

export const runtime = 'nodejs'

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedAppUser()

  if (!authenticatedUser || !authenticatedUser.appUser) {
    return errorResponse('Please sign in again to continue.', 401)
  }

  if (authenticatedUser.appUser.role !== 'admin') {
    return errorResponse('Only administrators can view attendance data.', 403)
  }

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const validationResult = attendanceQuerySchema.safeParse(searchParams)

  if (!validationResult.success) {
    return errorResponse(
      validationResult.error.issues.map((e) => e.message).join(', '),
      400
    )
  }

  const { view } = validationResult.data
  const downloadUids = getTrackedAttendanceDownloadUids()

  try {
    if (view === 'monthly') {
      const month = normalizeAttendanceMonth(validationResult.data.month ?? null)
      const result = await getMonthlyAttendance(month, {
        downloadUids,
      })

      return Response.json({
        month: result.month,
        people: result.people,
        startDate: result.startDate,
        endDate: result.endDate,
        users: result.users,
        view,
      })
    }

    const date = normalizeAttendanceDate(validationResult.data.date ?? null)
    const result = await getDailyAttendance(date, {
      downloadUids,
    })

    return Response.json({
      date: result.date,
      events: result.events,
      people: result.people,
      users: result.users,
      view,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load attendance data right now.'
    return errorResponse(message, 500)
  }
}
