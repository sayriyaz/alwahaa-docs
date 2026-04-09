'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { APP_ROLES, type AppRole } from '@/lib/auth-constants'
import type { ManagedAppUser } from '@/lib/app-users'

type CreateUserForm = {
  email: string
  password: string
  full_name: string
  role: AppRole
}

type EditUserForm = {
  full_name: string
  role: AppRole
}

type ApiPayload = {
  error?: string
  user?: ManagedAppUser
}

const EMPTY_CREATE_FORM: CreateUserForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'editor',
}

function sortUsers(users: ManagedAppUser[]) {
  return [...users].sort((left, right) => right.created_at.localeCompare(left.created_at))
}

function formatCreatedAt(value: string) {
  const formatter = new Intl.DateTimeFormat('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dubai',
  })

  const parts = formatter.formatToParts(new Date(value))
  const dateParts = {
    day: '',
    month: '',
    year: '',
    hour: '',
    minute: '',
    dayPeriod: '',
  }

  for (const part of parts) {
    if (part.type in dateParts) {
      dateParts[part.type as keyof typeof dateParts] = part.value
    }
  }

  return `${dateParts.day} ${dateParts.month} ${dateParts.year}, ${dateParts.hour}:${dateParts.minute} ${dateParts.dayPeriod}`.trim()
}

async function readApiPayload(response: Response) {
  const text = await response.text()
  if (!text) {
    return {} satisfies ApiPayload
  }

  return JSON.parse(text) as ApiPayload
}

export default function UsersAdminClient({
  currentUserId,
  initialUsers,
  initialError,
}: {
  currentUserId: string
  initialUsers: ManagedAppUser[]
  initialError: string
}) {
  const router = useRouter()
  const [users, setUsers] = useState(() => sortUsers(initialUsers))
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE_FORM)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm>({ full_name: '', role: 'editor' })
  const [creating, setCreating] = useState(false)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [pageError, setPageError] = useState(initialError)
  const [pageNotice, setPageNotice] = useState('')

  function openEditForm(user: ManagedAppUser) {
    setEditingUserId(user.id)
    setEditForm({
      full_name: user.full_name ?? '',
      role: user.role,
    })
    setPageError('')
    setPageNotice('')
  }

  function cancelEditForm() {
    setEditingUserId(null)
    setEditForm({ full_name: '', role: 'editor' })
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setCreating(true)
    setPageError('')
    setPageNotice('')

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createForm),
    })

    const payload = await readApiPayload(response)
    setCreating(false)

    if (!response.ok || !payload.user) {
      setPageError(payload.error ?? 'Unable to create that user right now.')
      return
    }

    setUsers((currentUsers) => sortUsers([payload.user as ManagedAppUser, ...currentUsers]))
    setCreateForm(EMPTY_CREATE_FORM)
    setPageNotice(`Created login access for ${payload.user.email}.`)
    router.refresh()
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingUserId) {
      return
    }

    setSavingUserId(editingUserId)
    setPageError('')
    setPageNotice('')

    const response = await fetch(`/api/admin/users/${editingUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editForm),
    })

    const payload = await readApiPayload(response)
    setSavingUserId(null)

    if (!response.ok || !payload.user) {
      setPageError(payload.error ?? 'Unable to update that user right now.')
      return
    }

    setUsers((currentUsers) =>
      sortUsers(currentUsers.map((user) => (user.id === payload.user?.id ? payload.user : user)))
    )
    cancelEditForm()
    setPageNotice(`Updated ${payload.user.email}.`)
    router.refresh()
  }

  async function handleRemoveUser(user: ManagedAppUser) {
    const confirmed = window.confirm(`Remove app access for ${user.email}? Their sign-in account will stay in Supabase.`)

    if (!confirmed) {
      return
    }

    setRemovingUserId(user.id)
    setPageError('')
    setPageNotice('')

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
    })
    const payload = await readApiPayload(response)
    setRemovingUserId(null)

    if (!response.ok) {
      setPageError(payload.error ?? 'Unable to remove that user right now.')
      return
    }

    setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id))
    if (editingUserId === user.id) {
      cancelEditForm()
    }
    setPageNotice(`Removed app access for ${user.email}.`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This page creates Supabase logins and assigns app roles. Email changes and permanent account deletion still need Supabase Authentication tools.
      </div>

      {pageError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
      ) : null}

      {pageNotice ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{pageNotice}</div>
      ) : null}

      <div className="rounded-xl border bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
          <p className="text-sm text-gray-500">Create a login and assign the correct role in one step.</p>
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleCreateUser(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Full Name</span>
              <input
                type="text"
                value={createForm.full_name}
                onChange={(event) => setCreateForm((currentForm) => ({ ...currentForm, full_name: event.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Staff member name"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Role</span>
              <select
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((currentForm) => ({ ...currentForm, role: event.target.value as AppRole }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {APP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Email</span>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((currentForm) => ({ ...currentForm, email: event.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="staff@company.com"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Temporary Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((currentForm) => ({ ...currentForm, password: event.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="At least 8 characters"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
            <p className="text-xs text-gray-500">
              If email confirmation is enabled in Supabase, the user may still need to verify their email.
            </p>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-gray-900">Current Users</h2>
        </div>

        {users.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">No users have app access yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => {
                  const isEditing = editingUserId === user.id
                  const isCurrentUser = user.id === currentUserId

                  return (
                    <tr key={user.id} className="align-top">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <form id={`edit-user-${user.id}`} onSubmit={(event) => void handleUpdateUser(event)}>
                            <input
                              type="text"
                              value={editForm.full_name}
                              onChange={(event) =>
                                setEditForm((currentForm) => ({ ...currentForm, full_name: event.target.value }))
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="Full name"
                            />
                          </form>
                        ) : (
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || 'No name set'}</p>
                            {isCurrentUser ? (
                              <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                You
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{user.email}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            form={`edit-user-${user.id}`}
                            value={editForm.role}
                            onChange={(event) =>
                              setEditForm((currentForm) => ({ ...currentForm, role: event.target.value as AppRole }))
                            }
                            disabled={isCurrentUser}
                            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                          >
                            {APP_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gray-700">
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatCreatedAt(user.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="submit"
                                form={`edit-user-${user.id}`}
                                disabled={savingUserId === user.id}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingUserId === user.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditForm}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditForm(user)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveUser(user)}
                                disabled={isCurrentUser || removingUserId === user.id}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removingUserId === user.id ? 'Removing...' : 'Remove Access'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
