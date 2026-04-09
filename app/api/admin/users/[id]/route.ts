import type { NextRequest } from 'next/server'
import { getAuthenticatedAppUser } from '@/lib/auth'
import { normalizeAppRole, type ManagedAppUser } from '@/lib/app-users'

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticatedUser = await getAuthenticatedAppUser()

  if (!authenticatedUser) {
    return errorResponse('Please sign in again to continue.', 401)
  }

  if (!authenticatedUser.appUser || authenticatedUser.appUser.role !== 'admin') {
    return errorResponse('Admin access is required for user management.', 403)
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const role = normalizeAppRole(body?.role)

  if (!role) {
    return errorResponse('Please choose a valid role.', 400)
  }

  if (id === authenticatedUser.appUser.id && role !== 'admin') {
    return errorResponse('You cannot remove your own admin access here.', 400)
  }

  const { data: updatedUser, error } = await authenticatedUser.db
    .from('app_users')
    .update({
      full_name: fullName || null,
      role,
    })
    .eq('id', id)
    .select('id, email, full_name, role, created_at')
    .single()

  if (error || !updatedUser) {
    return errorResponse(error?.message ?? 'Unable to update that user right now.', 400)
  }

  return Response.json({ user: updatedUser as ManagedAppUser })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticatedUser = await getAuthenticatedAppUser()

  if (!authenticatedUser) {
    return errorResponse('Please sign in again to continue.', 401)
  }

  if (!authenticatedUser.appUser || authenticatedUser.appUser.role !== 'admin') {
    return errorResponse('Admin access is required for user management.', 403)
  }

  const { id } = await params

  if (id === authenticatedUser.appUser.id) {
    return errorResponse('You cannot remove your own access from the app here.', 400)
  }

  const { error } = await authenticatedUser.db
    .from('app_users')
    .delete()
    .eq('id', id)

  if (error) {
    return errorResponse(error.message, 400)
  }

  return Response.json({ success: true })
}
