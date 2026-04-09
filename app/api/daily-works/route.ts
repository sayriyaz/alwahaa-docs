import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedAppUser } from '@/lib/auth'
import { getDailyWorks } from '@/lib/daily-works'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedAppUser()

  if (!authenticatedUser || !authenticatedUser.appUser) {
    return errorResponse('Please sign in again to continue.', 401)
  }

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const validationResult = querySchema.safeParse(searchParams)

  if (!validationResult.success) {
    return errorResponse('Invalid date format, expected YYYY-MM-DD', 400)
  }

  const result = await getDailyWorks(validationResult.data.date ?? null, authenticatedUser.db)

  if (result.error) {
    return errorResponse(result.error.message ?? 'Unable to load the daily works right now.', 400)
  }

  return Response.json({
    date: result.date,
    items: result.data,
  })
}
