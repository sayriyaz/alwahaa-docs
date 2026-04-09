import { APP_ROLES, type AppRole } from '@/lib/auth-constants'
import { supabase } from '@/lib/supabase'

export type ManagedAppUser = {
  id: string
  email: string
  full_name: string | null
  role: AppRole
  created_at: string
}

export type AssignableUser = {
  id: string
  email: string
  full_name: string | null
  role: AppRole
  label: string
}

type QueryClient = Pick<typeof supabase, 'from'>

export function normalizeAppRole(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  return APP_ROLES.find((role) => role === value) ?? null
}

function buildAssignableUserLabel(fullName: string | null, email: string) {
  return fullName?.trim() || email
}

export async function getAssignableUsers(queryClient: QueryClient = supabase) {
  const { data, error } = await queryClient
    .from('app_users')
    .select('id, email, full_name, role')
    .order('full_name', { ascending: true })
    .order('email', { ascending: true })

  if (error) {
    return [] as AssignableUser[]
  }

  return ((data ?? []) as Array<Omit<AssignableUser, 'label'>>).map((user) => ({
    ...user,
    label: buildAssignableUserLabel(user.full_name, user.email),
  }))
}
