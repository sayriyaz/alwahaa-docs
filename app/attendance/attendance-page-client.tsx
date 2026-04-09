'use client'

import { startTransition, useEffect, useState, type ReactNode } from 'react'
import AppBrandLink from '@/components/app-brand-link'
import type {
  AttendanceStatusCode,
  AttendanceTrackedStaff,
} from '@/lib/attendance-staff'
import { buildDailyAttendanceRoster, buildMonthlyAttendanceRoster } from '@/lib/attendance-staff'
import type {
  AttendancePunchEvent,
  DailyAttendanceResult,
  MonthlyAttendanceResult,
} from '@/lib/biometric-attendance'

type AttendanceView = 'daily' | 'monthly'
type StatusFilter = 'all' | AttendanceStatusCode

type AttendanceApiPayload = {
  date?: string
  endDate?: string
  error?: string
  events?: AttendancePunchEvent[]
  month?: string
  people?: DailyAttendanceResult['people'] | MonthlyAttendanceResult['people']
  startDate?: string
  users?: unknown[]
  view?: AttendanceView
}

type DailyTableRow = {
  deviceUserId: string
  firstPunch: string | null
  fullName: string
  lastPunch: string | null
  punchCount: number
  role: string | null
  statusCode: AttendanceStatusCode | null
  statusLabel: string
}

function formatDateLabel(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-AE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)
}

function formatMonthLabel(value: string) {
  const parsedDate = new Date(`${value}-01T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-AE', {
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)
}

function formatClockTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(value)
}

function getRoleLabel(value: string | null) {
  if (!value) {
    return 'Unassigned'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getStatusLabel(code: AttendanceStatusCode) {
  switch (code) {
    case 'P':
      return 'Present'
    case 'A':
      return 'Absent'
    case 'MP':
      return 'Miss Punch'
    case 'PN':
      return 'Pending'
    default:
      return 'Future'
  }
}

function getMonthlyDisplayCode(code: AttendanceStatusCode) {
  return code === 'MP' ? 'M' : code
}

function getStatusDotClasses(code: AttendanceStatusCode | null) {
  switch (code) {
    case 'P':
      return 'bg-emerald-500'
    case 'A':
      return 'bg-rose-500'
    case 'MP':
      return 'bg-amber-500'
    case 'PN':
      return 'bg-yellow-400'
    default:
      return 'bg-slate-300'
  }
}

function getStatusTextClasses(code: AttendanceStatusCode) {
  switch (code) {
    case 'P':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'A':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'MP':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'PN':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-600'
  }
}

function getSummaryToneClasses(code: AttendanceStatusCode) {
  switch (code) {
    case 'P':
      return 'text-emerald-700'
    case 'A':
      return 'text-rose-700'
    case 'MP':
      return 'text-amber-700'
    case 'PN':
      return 'text-yellow-700'
    default:
      return 'text-slate-700'
  }
}

function getDailyCardClasses(code: AttendanceStatusCode | null) {
  switch (code) {
    case 'A':
      return 'border-rose-200 bg-[linear-gradient(180deg,#fff7f7_0%,#fff1f2_100%)]'
    case 'MP':
      return 'border-amber-200 bg-[linear-gradient(180deg,#fffdf4_0%,#fff7ed_100%)]'
    case 'PN':
      return 'border-yellow-200 bg-[linear-gradient(180deg,#fffef1_0%,#fefce8_100%)]'
    default:
      return 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]'
  }
}

function Surface({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`attendance-panel overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)] ${className}`}
    >
      {children}
    </section>
  )
}

function StatusPill({
  code,
}: {
  code: AttendanceStatusCode
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusTextClasses(code)}`}
    >
      <span className={`h-2 w-2 rounded-full ${getStatusDotClasses(code)}`} aria-hidden="true" />
      {getStatusLabel(code)}
    </span>
  )
}

function SummaryStripButton({
  active,
  code,
  count,
  onClick,
}: {
  active: boolean
  code: AttendanceStatusCode
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
        active ? 'bg-slate-900 text-white' : 'hover:bg-white'
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-white' : getStatusDotClasses(code)}`}
        aria-hidden="true"
      />
      <span className={active ? 'text-white' : getSummaryToneClasses(code)}>
        {getStatusLabel(code)}: {count}
      </span>
    </button>
  )
}

function LegendPill({
  code,
  label,
}: {
  code: AttendanceStatusCode
  label: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${getStatusTextClasses(code)}`}
    >
      <span className="font-mono">{getMonthlyDisplayCode(code)}</span>
      <span>{label}</span>
    </span>
  )
}

export default function AttendancePageClient({
  initialDate,
  initialDailyData,
  initialError,
  initialMonth,
  initialMonthlyData,
  initialView,
  trackedStaff,
}: {
  initialDate: string
  initialDailyData: DailyAttendanceResult | null
  initialError: string
  initialMonth: string
  initialMonthlyData: MonthlyAttendanceResult | null
  initialView: AttendanceView
  trackedStaff: AttendanceTrackedStaff[]
}) {
  const [view, setView] = useState<AttendanceView>(initialView)
  const [selectedDate, setSelectedDate] = useState(initialDailyData?.date ?? initialDate)
  const [selectedMonth, setSelectedMonth] = useState(initialMonthlyData?.month ?? initialMonth)
  const [dailyData, setDailyData] = useState<DailyAttendanceResult | null>(initialDailyData)
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendanceResult | null>(initialMonthlyData)
  const [pageError, setPageError] = useState(initialError)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [consoleClock, setConsoleClock] = useState('')

  useEffect(() => {
    function updateClock() {
      setConsoleClock(formatClockTime(new Date()))
    }

    updateClock()
    const interval = window.setInterval(updateClock, 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const dailyRoster = buildDailyAttendanceRoster({
    date: selectedDate,
    dailyAttendance: dailyData,
    trackedStaff,
  })
  const monthlyRoster = buildMonthlyAttendanceRoster({
    month: selectedMonth,
    monthlyAttendance: monthlyData,
    trackedStaff,
  })

  const dailySyncUnavailable = Boolean(pageError) && !dailyData
  const monthlySyncUnavailable = Boolean(pageError) && !monthlyData

  const filteredDailyRoster = dailyRoster.filter((entry) => {
    const matchesStatus = statusFilter === 'all' || entry.status.code === statusFilter
    return matchesStatus
  })

  const filteredMonthlyRoster = monthlyRoster.filter((entry) => {
    const matchesStatus =
      statusFilter === 'all' || entry.dayStates.some((dayState) => dayState.code === statusFilter)
    return matchesStatus
  })

  const dailyTableRows: DailyTableRow[] = dailySyncUnavailable
    ? trackedStaff.map((entry) => ({
        deviceUserId: entry.deviceUserId,
        firstPunch: null,
        fullName: entry.fullName,
        lastPunch: null,
        punchCount: 0,
        role: entry.role,
        statusCode: null,
        statusLabel: 'Unavailable',
      }))
    : filteredDailyRoster.map((entry) => ({
        deviceUserId: entry.deviceUserId,
        firstPunch: entry.firstPunch,
        fullName: entry.fullName,
        lastPunch: entry.lastPunch,
        punchCount: entry.punchCount,
        role: entry.role,
        statusCode: entry.status.code,
        statusLabel: entry.status.label,
      }))

  const dailySummary = {
    absent: dailySyncUnavailable ? 0 : dailyRoster.filter((entry) => entry.status.code === 'A').length,
    missPunch: dailySyncUnavailable ? 0 : dailyRoster.filter((entry) => entry.status.code === 'MP').length,
    pending: dailySyncUnavailable ? 0 : dailyRoster.filter((entry) => entry.status.code === 'PN').length,
    present: dailySyncUnavailable ? 0 : dailyRoster.filter((entry) => entry.status.code === 'P').length,
  }

  const monthlySummary = {
    absent: monthlySyncUnavailable ? 0 : monthlyRoster.reduce((sum, entry) => sum + entry.counts.absent, 0),
    missPunch: monthlySyncUnavailable ? 0 : monthlyRoster.reduce((sum, entry) => sum + entry.counts.missPunch, 0),
    pending: monthlySyncUnavailable ? 0 : monthlyRoster.reduce((sum, entry) => sum + entry.counts.pending, 0),
    present: monthlySyncUnavailable ? 0 : monthlyRoster.reduce((sum, entry) => sum + entry.counts.present, 0),
  }

  async function loadAttendance(nextView: AttendanceView, nextValue: string) {
    setPageError('')

    const searchParams = new URLSearchParams({
      view: nextView,
      [nextView === 'daily' ? 'date' : 'month']: nextValue,
    })

    try {
      const response = await fetch(`/api/attendance?${searchParams.toString()}`, {
        method: 'GET',
      })
      const payload = (await response.json().catch(() => ({}))) as AttendanceApiPayload

      if (!response.ok) {
        setPageError(payload.error ?? 'Unable to load attendance data right now.')
        return
      }

      startTransition(() => {
        if (nextView === 'daily') {
          setDailyData({
            date: payload.date ?? nextValue,
            events: (payload.events ?? []) as DailyAttendanceResult['events'],
            people: (payload.people ?? []) as DailyAttendanceResult['people'],
            users: (payload.users ?? []) as DailyAttendanceResult['users'],
          })
          setSelectedDate(payload.date ?? nextValue)
        } else {
          setMonthlyData({
            endDate: payload.endDate ?? '',
            month: payload.month ?? nextValue,
            people: (payload.people ?? []) as MonthlyAttendanceResult['people'],
            startDate: payload.startDate ?? '',
            users: (payload.users ?? []) as MonthlyAttendanceResult['users'],
          })
          setSelectedMonth(payload.month ?? nextValue)
        }
      })
    } catch {
      setPageError('Unable to load attendance data right now.')
    }
  }

  function handleViewChange(nextView: AttendanceView) {
    setView(nextView)
    setStatusFilter('all')

    if (nextView === 'daily' && !dailyData) {
      void loadAttendance('daily', selectedDate)
    }

    if (nextView === 'monthly' && !monthlyData) {
      void loadAttendance('monthly', selectedMonth)
    }
  }

  function handleStatusFilter(nextFilter: AttendanceStatusCode) {
    setStatusFilter((current) => (current === nextFilter ? 'all' : nextFilter))
  }

  function handlePrint() {
    window.print()
  }

  const summaryValues = view === 'daily' ? dailySummary : monthlySummary
  const monthlyShownCount = monthlySyncUnavailable ? trackedStaff.length : filteredMonthlyRoster.length

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .attendance-no-print {
            display: none !important;
          }

          .attendance-shell {
            max-width: none !important;
            padding: 0 !important;
          }

          .attendance-panel,
          .attendance-panel * {
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border-color: #dbe2ea !important;
          }

          .attendance-background {
            display: none !important;
          }

          .attendance-matrix-scroll {
            overflow: visible !important;
          }

          .attendance-sticky {
            position: static !important;
            top: auto !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#edf3f8] text-slate-950">
        <div className="attendance-background pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(14,165,233,0.08),transparent_20%),radial-gradient(circle_at_85%_12%,rgba(34,197,94,0.08),transparent_18%),linear-gradient(180deg,#f8fbfd_0%,#edf3f8_45%,#e8eff5_100%)]" />
        </div>

        <div className="attendance-shell relative mx-auto max-w-[1520px] px-4 py-5 lg:px-6 lg:py-6">
          <div className="attendance-sticky attendance-no-print sticky top-4 z-20">
            <Surface className="px-4 py-4 lg:px-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <AppBrandLink compact subtitle="Attendance" />
                  <div className="hidden h-10 w-px bg-slate-200 xl:block" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Attendance</p>
                    <p className="text-xs text-slate-500">
                      {view === 'daily' ? formatDateLabel(selectedDate) : formatMonthLabel(selectedMonth)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {view === 'daily' ? (
                    <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">Date</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => {
                          const nextDate = event.target.value
                          setSelectedDate(nextDate)
                          void loadAttendance('daily', nextDate)
                        }}
                        className="bg-transparent text-slate-950 outline-none"
                      />
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">Month</span>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(event) => {
                          const nextMonth = event.target.value
                          setSelectedMonth(nextMonth)
                          void loadAttendance('monthly', nextMonth)
                        }}
                        className="bg-transparent text-slate-950 outline-none"
                      />
                    </label>
                  )}

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[0.68rem] text-slate-600">
                    {consoleClock || '--:--'}
                  </span>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    PDF
                  </button>
                </div>
              </div>
            </Surface>
          </div>

          <div className="mt-4">
            <Surface className="px-4 py-3 lg:px-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <SummaryStripButton
                  active={statusFilter === 'P'}
                  code="P"
                  count={summaryValues.present}
                  onClick={() => handleStatusFilter('P')}
                />
                <SummaryStripButton
                  active={statusFilter === 'PN'}
                  code="PN"
                  count={summaryValues.pending}
                  onClick={() => handleStatusFilter('PN')}
                />
                <SummaryStripButton
                  active={statusFilter === 'A'}
                  code="A"
                  count={summaryValues.absent}
                  onClick={() => handleStatusFilter('A')}
                />
                <SummaryStripButton
                  active={statusFilter === 'MP'}
                  code="MP"
                  count={summaryValues.missPunch}
                  onClick={() => handleStatusFilter('MP')}
                />

                <div className="ml-auto inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => handleViewChange('daily')}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      view === 'daily' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewChange('monthly')}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      view === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>

                {statusFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    Clear filter
                  </button>
                ) : null}
              </div>

              {pageError ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {pageError}
                </div>
              ) : null}
            </Surface>
          </div>

          {view === 'daily' ? (
            <div className="mt-4">
              <Surface className="px-4 py-4 lg:px-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Daily View</p>
                    <p className="text-xs text-slate-500">{dailyTableRows.length} staff shown</p>
                  </div>
                  {statusFilter !== 'all' ? (
                    <StatusPill code={statusFilter} />
                  ) : (
                    <span className="text-xs text-slate-500">Live roster</span>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {dailyTableRows.length ? (
                    dailyTableRows.map((entry) => (
                      <article
                        key={`${entry.deviceUserId}-${selectedDate}`}
                        className={`rounded-[26px] border px-4 py-4 transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] ${getDailyCardClasses(entry.statusCode)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold tracking-tight text-slate-950">
                              {entry.fullName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {getRoleLabel(entry.role)} · ID {entry.deviceUserId}
                            </p>
                          </div>

                          {entry.statusCode ? (
                            <StatusPill code={entry.statusCode} />
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                              <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
                              {entry.statusLabel}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 backdrop-blur-sm">
                            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">First In</p>
                            <p className="mt-2 font-mono text-lg text-slate-950">{entry.firstPunch ?? '--:--'}</p>
                          </div>
                          <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 backdrop-blur-sm">
                            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Last Out</p>
                            <p className="mt-2 font-mono text-lg text-slate-950">{entry.lastPunch ?? '--:--'}</p>
                          </div>
                          <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 backdrop-blur-sm">
                            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Punches</p>
                            <p className="mt-2 font-mono text-lg text-slate-950">{entry.punchCount}</p>
                          </div>
                        </div>

                        {entry.statusCode === 'A' ? (
                          <div className="mt-4 rounded-2xl border border-rose-200 bg-white/70 px-3 py-3 text-sm text-rose-700">
                            No biometric punch recorded after the 10 AM cutoff.
                          </div>
                        ) : null}

                        {entry.statusCode === 'MP' ? (
                          <div className="mt-4 rounded-2xl border border-amber-200 bg-white/70 px-3 py-3 text-sm text-amber-700">
                            Punch sequence looks incomplete after the 7 PM review cutoff.
                          </div>
                        ) : null}

                        {!entry.statusCode ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 px-3 py-3 text-sm text-slate-600">
                            Device sync is unavailable right now, so this employee&apos;s live attendance could not be loaded.
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4 rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                      No employees match the current status filter.
                    </div>
                  )}
                </div>
              </Surface>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <LegendPill code="P" label="Present" />
                <LegendPill code="A" label="Absent" />
                <LegendPill code="MP" label="Miss Punch" />
                <LegendPill code="PN" label="Pending" />
              </div>

              <Surface>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Monthly View</p>
                    <p className="text-xs text-slate-500">{monthlyShownCount} staff shown</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatMonthLabel(selectedMonth)}</span>
                </div>

                <div className="attendance-matrix-scroll overflow-x-auto">
                  {monthlySyncUnavailable ? (
                    <div className="px-4 py-8">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                        Monthly data cannot be calculated until the biometric device reconnects and the session issue is resolved.
                      </div>
                    </div>
                  ) : (
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                          <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-medium">
                            Name
                          </th>
                          {filteredMonthlyRoster[0]?.dayStates.map((dayState) => (
                            <th
                              key={dayState.date}
                              className="min-w-11 border-b border-slate-200 px-2 py-3 text-center font-medium"
                            >
                              {dayState.date.slice(-2)}
                            </th>
                          ))}
                          <th className="border-b border-slate-200 px-3 py-3 text-center font-medium">P</th>
                          <th className="border-b border-slate-200 px-3 py-3 text-center font-medium">A</th>
                          <th className="border-b border-slate-200 px-3 py-3 text-center font-medium">M</th>
                          <th className="border-b border-slate-200 px-3 py-3 text-center font-medium">PN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMonthlyRoster.length ? (
                          filteredMonthlyRoster.map((entry) => (
                            <tr key={entry.deviceUserId} className="hover:bg-slate-50/60">
                              <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-3">
                                <p className="font-medium text-slate-950">{entry.fullName}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {getRoleLabel(entry.role)} · ID {entry.deviceUserId}
                                </p>
                              </td>
                              {entry.dayStates.map((dayState) => (
                                <td key={dayState.date} className="border-b border-slate-200 px-1.5 py-2 text-center">
                                  <span
                                    title={`${dayState.date} · ${dayState.label}${dayState.firstPunch ? ` · ${dayState.firstPunch}` : ''}${dayState.lastPunch ? ` / ${dayState.lastPunch}` : ''}`}
                                    className={`inline-flex min-w-8 justify-center rounded-md border px-2 py-1 font-mono text-[0.66rem] uppercase tracking-[0.08em] ${getStatusTextClasses(dayState.code)}`}
                                  >
                                    {getMonthlyDisplayCode(dayState.code)}
                                  </span>
                                </td>
                              ))}
                              <td className="border-b border-slate-200 px-3 py-3 text-center font-mono text-emerald-700">
                                {entry.counts.present}
                              </td>
                              <td className="border-b border-slate-200 px-3 py-3 text-center font-mono text-rose-700">
                                {entry.counts.absent}
                              </td>
                              <td className="border-b border-slate-200 px-3 py-3 text-center font-mono text-amber-700">
                                {entry.counts.missPunch}
                              </td>
                              <td className="border-b border-slate-200 px-3 py-3 text-center font-mono text-yellow-700">
                                {entry.counts.pending}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={40} className="px-4 py-10 text-center text-sm text-slate-500">
                              No employees match the current status filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </Surface>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
