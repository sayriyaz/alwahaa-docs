import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-constants'

type SessionRequestBody = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number | null
}

function shouldUseSecureCookies(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim() === 'https'
  }

  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return process.env.NODE_ENV === 'production'
  }
}

function getCookieConfig(request: Request, maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureCookies(request),
    path: '/',
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const body = (await request.json()) as SessionRequestBody

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json(
      { error: 'Missing session tokens.' },
      { status: 400 }
    )
  }

  const maxAge = body.expiresAt
    ? Math.max(body.expiresAt - Math.floor(Date.now() / 1000), 60)
    : undefined

  cookieStore.set(ACCESS_TOKEN_COOKIE, body.accessToken, getCookieConfig(request, maxAge))
  cookieStore.set(
    REFRESH_TOKEN_COOKIE,
    body.refreshToken,
    getCookieConfig(request, 60 * 60 * 24 * 30)
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
  cookieStore.delete(REFRESH_TOKEN_COOKIE)

  return NextResponse.json({ ok: true })
}
