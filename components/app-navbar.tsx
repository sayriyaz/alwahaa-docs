'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { syncServerSession } from '@/lib/auth-client'
import type { AppRole } from '@/lib/auth-constants'
import alWahaaLogo from '@/Picture/alwahaa grp.png'

type AppUser = {
  id: string
  email: string
  full_name: string | null
  role: AppRole
}

type AttendanceStatusCode = 'P' | 'A' | 'MP' | 'PN' | '-' | null

function getAttendanceDotClasses(code: AttendanceStatusCode) {
  switch (code) {
    case 'P': return 'bg-emerald-500 ring-emerald-100'
    case 'A': return 'bg-rose-500 ring-rose-100'
    case 'PN':
    case 'MP': return 'bg-amber-400 ring-amber-100'
    default: return 'bg-slate-300 ring-slate-100'
  }
}

function getAttendanceLabel(code: AttendanceStatusCode) {
  switch (code) {
    case 'P': return 'Present today'
    case 'A': return 'Absent today'
    case 'PN': return 'Not punched in yet'
    case 'MP': return 'Punch needs review'
    default: return 'Attendance unavailable'
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AW'
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/clients', label: 'Clients' },
  { href: '/daily-works', label: 'Daily Works' },
  { href: '/attendance', label: 'Attendance', adminOnly: true },
  { href: '/users', label: 'Users', adminOnly: true },
]

function shouldHide(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/access-denied' ||
    pathname.endsWith('/print') ||
    pathname.includes('/receipt')
  )
}

export default function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusCode>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const hidden = shouldHide(pathname)

  useEffect(() => {
    if (hidden) { setAppUser(null); return }
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) { setAppUser(null); return }
      const { data } = await supabase
        .from('app_users')
        .select('id, email, full_name, role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!cancelled) {
        setAppUser((data ?? null) as AppUser | null)
        // Fetch attendance status in background
        fetch('/api/attendance/my-status')
          .then((r) => r.json())
          .then((json) => { if (!cancelled) setAttendanceStatus(json.statusCode ?? null) })
          .catch(() => undefined)
      }
    }

    void load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void load())
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [hidden])

  if (hidden || !appUser) return null

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error && !error.message.toLowerCase().includes('refresh token')) throw error
    } finally {
      await syncServerSession(null).catch(() => undefined)
      router.push('/login')
      router.refresh()
      setSigningOut(false)
    }
  }

  const visibleLinks = NAV_LINKS.filter((l) => !l.adminOnly || appUser.role === 'admin')

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 lg:px-6">

        {/* Brand */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm transition group-hover:-translate-y-0.5">
            <Image src={alWahaaLogo} alt="Al Wahaa Group" fill sizes="36px" className="object-contain p-1" priority />
          </div>
          <div className="hidden sm:block">
            <p className="text-[0.6rem] uppercase tracking-[0.26em] text-amber-700 leading-none">Al Wahaa Group</p>
            <p className="text-sm font-semibold tracking-tight text-slate-900 leading-tight">Alwahaa Ops</p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive(link.href)
                  ? 'bg-slate-900 text-white shadow-[0_4px_14px_rgba(15,23,42,0.20)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User avatar + dropdown */}
        <div className="relative flex shrink-0 items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
          </button>

          {/* Avatar button */}
          <div className="group relative">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(15,23,42,0.20)] transition hover:scale-105 focus:outline-none"
              aria-label="User menu"
              title={getAttendanceLabel(attendanceStatus)}
            >
              {getInitials(appUser.full_name || appUser.email)}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${getAttendanceDotClasses(attendanceStatus)}`}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown */}
            <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 w-56 origin-top-right rounded-[18px] border border-slate-200 bg-white p-2.5 opacity-0 shadow-[0_20px_50px_rgba(15,23,42,0.12)] transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="rounded-[14px] bg-slate-50 px-3 py-2.5 mb-2">
                <p className="truncate text-sm font-semibold text-slate-900">{appUser.full_name || appUser.email}</p>
                <p className="text-xs text-slate-500 mt-0.5">{appUser.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-600">{appUser.role}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${attendanceStatus === 'P' ? 'bg-emerald-100 text-emerald-700' : attendanceStatus === 'A' ? 'bg-rose-100 text-rose-700' : attendanceStatus === 'PN' || attendanceStatus === 'MP' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${getAttendanceDotClasses(attendanceStatus).split(' ')[0]}`} />
                    {getAttendanceLabel(attendanceStatus)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                {appUser.role === 'admin' && (
                  <Link href="/users" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                    Manage Users
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
          <nav className="mt-3 flex flex-wrap gap-2">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive(link.href)
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
