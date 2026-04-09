'use client'

import Link from 'next/link'
import { startTransition, useMemo, useState } from 'react'
import type { DailyWorkItem } from '@/lib/daily-works'

type ApiPayload = {
  date?: string
  error?: string
  items?: DailyWorkItem[]
}

type TeamLoadRow = {
  name: string
  totalTasks: number
}

function buildTeamLoad(items: DailyWorkItem[]) {
  const loadMap = new Map<string, number>()

  for (const item of items) {
    const assignee = item.assigned_to?.trim() || 'Unassigned'
    loadMap.set(assignee, (loadMap.get(assignee) ?? 0) + 1)
  }

  return [...loadMap.entries()]
    .map(([name, totalTasks]) => ({ name, totalTasks } satisfies TeamLoadRow))
    .sort((left, right) => right.totalTasks - left.totalTasks || left.name.localeCompare(right.name))
}

export default function DashboardTeamLoadCard({
  initialDate,
  initialItems,
}: {
  initialDate: string
  initialItems: DailyWorkItem[]
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [cardError, setCardError] = useState('')

  const teamLoad = useMemo(() => buildTeamLoad(items), [items])
  const totalTasks = items.length

  async function loadTeamLoad(dateValue: string) {
    setSelectedDate(dateValue)
    setLoading(true)
    setCardError('')

    try {
      const response = await fetch(`/api/daily-works?date=${encodeURIComponent(dateValue)}`, {
        method: 'GET',
      })
      const payload = (await response.json().catch(() => ({}))) as ApiPayload

      if (!response.ok) {
        setCardError(payload.error ?? 'Unable to load task assignments right now.')
        return
      }

      startTransition(() => {
        setItems(payload.items ?? [])
      })
    } catch {
      setCardError('Unable to load task assignments right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_26px_55px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">Team Load</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{totalTasks}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Task load by staff for the selected date. Click any staff row to open their tasks.
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            {teamLoad.length} staff
          </p>
        </div>

        <label className="text-sm font-medium text-slate-600">
          <span className="mb-1 block">Task Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => void loadTeamLoad(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4">
        {cardError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{cardError}</p>
        ) : null}

        <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          <span>{loading ? 'Updating task load…' : 'All staff task counts'}</span>
          <Link href={`/daily-works?date=${encodeURIComponent(selectedDate)}`} className="text-blue-700 hover:text-blue-800">
            Open all tasks
          </Link>
        </div>

        {teamLoad.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
            No tasks assigned for this date.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {teamLoad.map((member) => (
              <Link
                key={member.name}
                href={`/daily-works?date=${encodeURIComponent(selectedDate)}&assignee=${encodeURIComponent(member.name)}`}
                className="min-w-[240px] rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
              >
                <div className="flex h-full flex-col justify-between gap-3">
                  <div>
                  <p className="font-medium text-slate-900">{member.name}</p>
                  <p className="text-slate-500">Open this staff member&apos;s tasks for {selectedDate}</p>
                  </div>
                  <div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      {member.totalTasks} tasks
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
