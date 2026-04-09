import Link from 'next/link'
import AppBrandLink from '@/components/app-brand-link'
import UsersAdminClient from '@/app/users/users-admin-client'
import { previewAppUser, previewManagedUsers } from '@/lib/preview-data'

export default function PreviewUsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AppBrandLink compact />
            <div className="hidden h-10 w-px bg-gray-200 md:block" />
            <Link href="/preview" className="text-sm text-gray-400 hover:text-gray-600">
              Dashboard
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500">Create staff logins and manage app roles without SQL.</p>
            </div>
          </div>
          <Link
            href="/preview"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="px-6 py-8">
        <UsersAdminClient
          currentUserId={previewAppUser.id}
          initialUsers={previewManagedUsers}
          initialError=""
        />
      </div>
    </div>
  )
}
