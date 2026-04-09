'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { syncServerSession } from '@/lib/auth-client'

const SESSION_CHECK_TIMEOUT_MS = 5_000

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])
}

export default function LoginForm({
  nextPath,
}: {
  nextPath: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkExistingSession() {
      try {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_CHECK_TIMEOUT_MS,
          'Session check timed out.'
        )

        if (cancelled) {
          return
        }

        if (session) {
          try {
            await withTimeout(
              syncServerSession(session),
              SESSION_CHECK_TIMEOUT_MS,
              'Session sync timed out.'
            )
          } catch {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => ({ error: null }))
            await syncServerSession(null).catch(() => undefined)

            if (cancelled) {
              return
            }

            setError('We could not restore your saved session. Please sign in again.')
            setCheckingSession(false)
            return
          }

          router.replace(nextPath)
          router.refresh()
          return
        }
      } catch {
        if (cancelled) {
          return
        }

        setError('We could not check your saved session. Please sign in.')
      }

      setCheckingSession(false)
    }

    void checkExistingSession()

    return () => {
      cancelled = true
    }
  }, [nextPath, router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError || !data.session) {
      setLoading(false)
      setError(signInError?.message || 'Unable to sign in right now.')
      return
    }

    try {
      await withTimeout(
        syncServerSession(data.session),
        SESSION_CHECK_TIMEOUT_MS,
        'Session sync timed out.'
      )
      router.replace(nextPath)
      router.refresh()
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => ({ error: null }))
      await syncServerSession(null).catch(() => undefined)
      setError('Sign-in worked, but the server session could not be created. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-2xl border bg-white px-6 py-5 text-sm text-gray-500 shadow-sm">
          Checking your session...
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500">
            Use your Alwahaa Ops account to access invoices, receipts, and client records.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
