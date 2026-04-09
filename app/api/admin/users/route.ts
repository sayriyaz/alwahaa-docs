import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createStatelessSupabase, getAuthenticatedAppUser } from '@/lib/auth'
import { normalizeAppRole, type ManagedAppUser } from '@/lib/app-users'

const createUserSchema = z.object({
  email: z.string().email().min(1).max(200),
  password: z.string().min(8).max(100),
  full_name: z.string().max(100).optional(),
  role: z.enum(['admin', 'editor', 'viewer']),
})

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedAppUser()

  if (!authenticatedUser) {
    return errorResponse('Please sign in again to continue.', 401)
  }

  if (!authenticatedUser.appUser || authenticatedUser.appUser.role !== 'admin') {
    return errorResponse('Admin access is required for user management.', 403)
  }

  const body = await request.json().catch(() => null)
  const validationResult = createUserSchema.safeParse(body)

  if (!validationResult.success) {
    return errorResponse(
      validationResult.error.issues.map((e) => e.message).join(', '),
      400
    )
  }

  const { email, password, full_name: fullName, role } = validationResult.data
  const normalizedEmail = email.toLowerCase().trim()

  const { data: existingUser } = await authenticatedUser.db
    .from('app_users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingUser) {
    return errorResponse('This email already has app access.', 409)
  }

  const authClient = createStatelessSupabase()
  const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
    email: normalizedEmail,
    password,
    options: fullName
      ? {
          data: {
            full_name: fullName.trim(),
          },
        }
      : undefined,
  })

  if (signUpError || !signUpData.user) {
    return errorResponse(signUpError?.message ?? 'Unable to create the sign-in account right now.', 400)
  }

  if (Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
    return errorResponse(
      'This email already exists in Supabase Authentication. Please use a new email address or finish setup from Supabase.',
      409
    )
  }

  const { data: insertedUser, error: insertError } = await authenticatedUser.db
    .from('app_users')
    .insert({
      id: signUpData.user.id,
      email: normalizedEmail,
      full_name: fullName?.trim() || null,
      role,
    })
    .select('id, email, full_name, role, created_at')
    .single()

  if (insertError || !insertedUser) {
    return errorResponse(
      `The sign-in account was created, but the app role could not be saved. ${insertError?.message ?? ''}`.trim(),
      400
    )
  }

  return Response.json({ user: insertedUser as ManagedAppUser }, { status: 201 })
}
