'use client'

import type { Session } from '@supabase/supabase-js'

type SessionPayload = {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
}

let lastSyncedSessionKey: string | null = null
let pendingSyncKey: string | null = null
let pendingSyncPromise: Promise<void> | null = null

function getSessionSyncKey(session: Session | null) {
  if (!session) {
    return 'signed-out'
  }

  return [session.access_token, session.refresh_token, session.expires_at ?? ''].join(':')
}

async function postSession(payload: SessionPayload) {
  const response = await fetch('/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Unable to sync the authenticated session with the server.')
  }
}

export async function syncServerSession(session: Session | null) {
  const nextSessionKey = getSessionSyncKey(session)

  if (lastSyncedSessionKey === nextSessionKey) {
    return
  }

  if (pendingSyncPromise && pendingSyncKey === nextSessionKey) {
    return await pendingSyncPromise
  }

  const syncPromise = (async () => {
    if (!session) {
      const response = await fetch('/auth/session', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Unable to clear the server session.')
      }
    } else {
      await postSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ?? null,
      })
    }

    lastSyncedSessionKey = nextSessionKey
  })()

  pendingSyncKey = nextSessionKey
  pendingSyncPromise = syncPromise

  try {
    await syncPromise
  } finally {
    if (pendingSyncPromise === syncPromise) {
      pendingSyncKey = null
      pendingSyncPromise = null
    }
  }
}
