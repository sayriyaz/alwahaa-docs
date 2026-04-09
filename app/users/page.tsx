import Link from 'next/link'
import { requireAuthenticatedAppUser } from '@/lib/auth'
import type { ManagedAppUser } from '@/lib/app-users'
import UsersAdminClient from './users-admin-client'

export default async function UsersPage() {
  const { appUser, db } = await requireAuthenticatedAppUser(['admin'])
  const { data, error } = await db
    .from('app_users')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Users</h1>
            <p className="text-sm text-slate-500">Create staff logins and manage app roles without SQL.</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <UsersAdminClient
          currentUserId={appUser.id}
          initialUsers={(data ?? []) as ManagedAppUser[]}
          initialError={error?.message ?? ''}
        />
      </div>
    </div>
  )
}
