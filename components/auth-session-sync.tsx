'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { syncServerSession } from '@/lib/auth-client'

export default function AuthSessionSync() {
  const pathname = usePathname()
  const shouldSkipSync = pathname === '/login'

  useEffect(() => {
    if (shouldSkipSync) {
      return
    }

    let cancelled = false

    async function hydrateServerSession() {
      try {
        const { data } = await supabase.auth.getSession()
        if (cancelled) {
          return
        }

        await syncServerSession(data.session ?? null)
      } catch {
        if (cancelled) {
          return
        }

        await syncServerSession(null).catch(() => undefined)
      }
    }

    void hydrateServerSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        return
      }

      void syncServerSession(session).catch(() => undefined)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [shouldSkipSync])

  return null
}
