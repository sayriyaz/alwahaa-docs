'use client'

import { useEffect, useState } from 'react'

function getToneClasses(tone: 'info' | 'warning' | 'danger' | 'success') {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-950'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-950'
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-950'
    default:
      return 'border-sky-200 bg-sky-50 text-slate-950'
  }
}

function getToneDotClasses(tone: 'info' | 'warning' | 'danger' | 'success') {
  switch (tone) {
    case 'success':
      return 'bg-emerald-500'
    case 'warning':
      return 'bg-amber-400'
    case 'danger':
      return 'bg-rose-500'
    default:
      return 'bg-sky-500'
  }
}

export default function DashboardAttendanceToast({
  actionLabel,
  anchored = false,
  description,
  durationMs = 7_000,
  showAction = false,
  showClose = false,
  title,
  tone = 'info',
}: {
  actionLabel?: string
  anchored?: boolean
  description: string
  durationMs?: number
  showAction?: boolean
  showClose?: boolean
  title: string
  tone?: 'info' | 'warning' | 'danger' | 'success'
}) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOpen(false)
    }, durationMs)

    return () => window.clearTimeout(timeout)
  }, [durationMs])

  if (!open) {
    return null
  }

  return (
    <div
      className={
        anchored
          ? 'pointer-events-none absolute right-0 top-[calc(100%+10px)] z-40 w-[min(88vw,340px)]'
          : 'pointer-events-none fixed right-4 top-4 z-50 w-[min(92vw,360px)] sm:right-6 sm:top-6'
      }
    >
      <div
        className={`pointer-events-auto border backdrop-blur ${anchored ? 'rounded-2xl px-4 py-3 shadow-[0_16px_34px_rgba(15,23,42,0.12)]' : 'rounded-[22px] px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]'} ${getToneClasses(tone)}`}
      >
        {anchored ? (
          <div className="flex items-start gap-3">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getToneDotClasses(tone)}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-700">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-1 text-lg leading-none text-slate-400 transition hover:text-slate-700"
              aria-label="Dismiss attendance reminder"
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Attendance Reminder</p>
                <h2 className="mt-2 text-base font-semibold tracking-tight">{title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
              </div>

              {showClose ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:text-slate-900"
                  aria-label="Dismiss attendance reminder"
                >
                  Close
                </button>
              ) : null}
            </div>

            {showAction && actionLabel ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Use biometric device to sync</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  {actionLabel}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
