'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { syncServerSession } from '@/lib/auth-client'
import type { AppRole } from '@/lib/auth-constants'
import DashboardAttendanceToast from '@/components/dashboard-attendance-toast'

function getAttendanceDotClasses(statusCode: string | null | undefined) {
  switch (statusCode) {
    case 'P':
      return 'bg-emerald-500 ring-emerald-100'
    case 'A':
      return 'bg-rose-500 ring-rose-100'
    case 'PN':
    case 'MP':
      return 'bg-amber-400 ring-amber-100'
    default:
      return 'bg-slate-300 ring-slate-100'
  }
}

function getAttendanceLabel(statusCode: string | null | undefined) {
  switch (statusCode) {
    case 'P':
      return 'Present'
    case 'A':
      return 'Absent'
    case 'PN':
      return 'Not punched yet'
    case 'MP':
      return 'Punch needs review'
    default:
      return 'Attendance unavailable'
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return 'AW'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function DashboardAccountControls({
  attendanceToast,
  attendanceStatusCode,
  email,
  fullName,
  role,
}: {
  attendanceToast?: {
    description: string
    title: string
    tone: 'info' | 'warning' | 'danger' | 'success'
  } | null
  attendanceStatusCode?: string | null
  email: string
  fullName: string | null
  role: AppRole
}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const displayName = fullName || email

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error && !error.message.toLowerCase().includes('refresh token')) {
        throw error
      }
    } finally {
      await syncServerSession(null).catch(() => undefined)
      router.push('/login')
      router.refresh()
      setSigningOut(false)
    }
  }

  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-900 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition hover:scale-[1.02] focus:outline-none"
        aria-label="Open user menu"
        title={getAttendanceLabel(attendanceStatusCode)}
      >
        {getInitials(displayName)}
        <span
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-4 ring-white ${getAttendanceDotClasses(attendanceStatusCode)}`}
          aria-hidden="true"
        />
      </button>

      {attendanceToast ? (
        <DashboardAttendanceToast
          anchored
          description={attendanceToast.description}
          durationMs={7_000}
          showClose
          title={attendanceToast.title}
          tone={attendanceToast.tone}
        />
      ) : null}

      <div className={`pointer-events-none absolute right-0 ${attendanceToast ? 'top-[calc(100%+104px)]' : 'top-[calc(100%+10px)]'} z-30 w-60 origin-top-right rounded-[20px] border border-slate-200 bg-white p-3 opacity-0 shadow-[0_22px_50px_rgba(15,23,42,0.12)] transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100`}>
        <div className="rounded-[18px] bg-slate-50 px-3 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
        </div>

        <div className="mt-3 space-y-2">
          {role === 'admin' ? (
            <Link
              href="/users"
              className="block rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              User Manager
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="block w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {signingOut ? 'Signing out...' : 'Log out'}
          </button>
        </div>
      </div>
    </div>
  )
}
