import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import {
  ACCESS_TOKEN_COOKIE,
  APP_ROLES,
  canEditRole,
  getRolePermissions,
  type AppPermissions,
  type AppRole,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth-constants'

const envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!envSupabaseUrl || !envSupabaseAnonKey) {
  throw new Error('Missing Supabase environment variables for authentication.')
}

const supabaseUrl = envSupabaseUrl
const supabaseAnonKey = envSupabaseAnonKey

type AppUserRecord = {
  id: string
  email: string
  full_name: string | null
  role: AppRole
}

export type { AppUserRecord }

export type ServerSupabase = SupabaseClient

export type AuthenticatedAppUser = {
  appUser: AppUserRecord | null
  db: ServerSupabase
  user: User
}

export function createStatelessSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createServerSupabase(accessToken: string): ServerSupabase {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => accessToken,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function validateAccessToken(accessToken: string | null, refreshToken: string | null) {
  if (!accessToken) {
    return null
  }

  const authClient = createStatelessSupabase()
  const directUserResponse = await authClient.auth.getUser(accessToken)
  if (directUserResponse.data.user) {
    return {
      accessToken,
      user: directUserResponse.data.user,
    }
  }

  if (!refreshToken) {
    return null
  }

  const refreshResponse = await authClient.auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (refreshResponse.error || !refreshResponse.data.session || !refreshResponse.data.user) {
    return null
  }

  return {
    accessToken: refreshResponse.data.session.access_token,
    user: refreshResponse.data.user,
  }
}

export async function getAuthenticatedAppUser() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null
  const validatedSession = await validateAccessToken(accessToken, refreshToken)

  if (!validatedSession) {
    return null
  }

  const db = createServerSupabase(validatedSession.accessToken)
  const { data: appUserData, error } = await db
    .from('app_users')
    .select('id, email, full_name, role')
    .eq('id', validatedSession.user.id)
    .maybeSingle()

  if (error || !appUserData) {
    return {
      appUser: null,
      db,
      user: validatedSession.user,
    } satisfies AuthenticatedAppUser
  }

  const role = APP_ROLES.find((currentRole) => currentRole === appUserData.role)
  if (!role) {
    return {
      appUser: null,
      db,
      user: validatedSession.user,
    } satisfies AuthenticatedAppUser
  }

  return {
    appUser: {
      ...(appUserData as Omit<AppUserRecord, 'role'>),
      role,
    },
    db,
    user: validatedSession.user,
  } satisfies AuthenticatedAppUser
}

export async function requireAuthenticatedAppUser(allowedRoles?: AppRole[]) {
  const authenticatedUser = await getAuthenticatedAppUser()

  if (!authenticatedUser) {
    redirect('/login')
  }

  if (!authenticatedUser.appUser) {
    redirect('/access-denied')
  }

  if (allowedRoles && !allowedRoles.includes(authenticatedUser.appUser.role)) {
    redirect('/access-denied')
  }

  return authenticatedUser
}

export function userCanEdit(role: AppRole) {
  return canEditRole(role)
}

export function getUserPermissions(role: AppRole): AppPermissions {
  return getRolePermissions(role)
}
