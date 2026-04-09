import { NextResponse, type NextRequest } from 'next/server'
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-constants'

function isPublicPath(pathname: string) {
  return pathname === '/login' || pathname === '/access-denied' || pathname.startsWith('/auth/') || pathname.startsWith('/preview')
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (accessToken) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
