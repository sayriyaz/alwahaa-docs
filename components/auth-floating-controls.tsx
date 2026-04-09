'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { syncServerSession } from '@/lib/auth-client'
import type { AppRole } from '@/lib/auth-constants'

type AppUser = {
  email: string
  full_name: string | null
  role: AppRole
}

function shouldHide(pathname: string) {
  return pathname === '/' || pathname === '/login' || pathname.endsWith('/print') || pathname.endsWith('/receipt')
}

export default function AuthFloatingControls() {
  const pathname = usePathname()
  const router = useRouter()
  const hidden = shouldHide(pathname)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (hidden) {
      setAppUser(null)
      return
    }

    let cancelled = false

    async function loadAppUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session || cancelled) {
          setAppUser(null)
          return
        }

        const { data } = await supabase
          .from('app_users')
          .select('email, full_name, role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!cancelled) {
          setAppUser((data ?? null) as AppUser | null)
        }
      } catch {
        if (!cancelled) {
          setAppUser(null)
        }
      }
    }

    void loadAppUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAppUser(null)
        return
      }

      void loadAppUser()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [hidden])

  if (hidden) {
    return null
  }

  if (!appUser) {
    return null
  }

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
    <div className="fixed bottom-4 right-4 z-50 rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
      <p className="text-sm font-semibold text-gray-900">{appUser.full_name || appUser.email}</p>
      <p className="text-xs uppercase tracking-wide text-gray-500">{appUser.role}</p>
      {appUser.role === 'admin' ? (
        <Link
          href="/users"
          className="mt-2 block rounded-lg border border-gray-200 px-3 py-1.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Manage Users
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  )
}
