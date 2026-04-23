'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAppTheme } from '@/components/app-theme-provider'
import type { EnrichedTask } from './page'

type Props = {
  tasks: EnrichedTask[]
  initialAssignee: string
  initialStatus: string
  initialDept: string
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? 'Pending').toLowerCase()
  if (s === 'done')
    return <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">Done</span>
  return <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">Open</span>
}

export default function TasksPageClient({ tasks, initialAssignee, initialStatus, initialDept }: Props) {
  const { isDark } = useAppTheme()
  const [assignee, setAssignee] = useState(initialAssignee)
  const [status, setStatus] = useState(initialStatus)
  const [dept, setDept] = useState(initialDept)
  const [search, setSearch] = useState('')

  const assignees = useMemo(() => {
    const s = new Set(tasks.map((t) => t.assigned_to?.trim() || 'Unassigned'))
    return ['', ...Array.from(s).sort()]
  }, [tasks])

  const depts = useMemo(() => {
    const s = new Set(tasks.map((t) => t.dept?.trim()).filter(Boolean) as string[])
    return ['', ...Array.from(s).sort()]
  }, [tasks])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tasks.filter((t) => {
      const tAssignee = t.assigned_to?.trim() || 'Unassigned'
      if (assignee && tAssignee !== assignee) return false
      if (dept && t.dept?.trim() !== dept) return false
      if (status === 'open' && (t.status ?? 'Pending').toLowerCase() === 'done') return false
      if (status === 'done' && (t.status ?? 'Pending').toLowerCase() !== 'done') return false
      if (q && !`${t.particulars} ${t.clientName} ${t.invoiceNo} ${t.dept} ${tAssignee}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [tasks, assignee, dept, status, search])

  const openCount = filtered.filter((t) => (t.status ?? 'Pending').toLowerCase() !== 'done').length
  const doneCount = filtered.filter((t) => (t.status ?? 'Pending').toLowerCase() === 'done').length

  const bg = isDark ? 'bg-[#0a0a0a] text-slate-100' : 'bg-slate-50 text-slate-900'
  const cardBg = isDark ? 'bg-[#111111] border-[#1e1e1e]' : 'bg-white border-slate-200'
  const inputCls = isDark
    ? 'bg-[#1a1a1a] border-[#2a2a2a] text-slate-100 placeholder:text-slate-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
  const selectCls = isDark
    ? 'bg-[#1a1a1a] border-[#2a2a2a] text-slate-100'
    : 'bg-white border-slate-200 text-slate-900'
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500'
  const rowHover = isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-slate-50'
  const thCls = isDark ? 'bg-[#161616] text-slate-400 border-[#1e1e1e]' : 'bg-slate-50 text-slate-500 border-slate-200'
  const tdCls = isDark ? 'border-[#1e1e1e] text-slate-200' : 'border-slate-100 text-slate-700'

  return (
    <main className={`min-h-screen px-4 py-8 ${bg}`}>
      <div className="mx-auto max-w-[1400px]">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">All Tasks</h1>
            <p className={`mt-0.5 text-sm ${mutedText}`}>
              {openCount} open · {doneCount} done · {filtered.length} total
              {assignee ? <> for <strong>{assignee}</strong></> : null}
            </p>
          </div>
          <Link
            href="/daily-works"
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${isDark ? 'border-[#2a2a2a] text-slate-300 hover:bg-[#1a1a1a]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            ← Daily Worksheet
          </Link>
        </div>

        {/* Filters */}
        <div className={`mb-6 rounded-xl border ${cardBg} p-4`}>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${inputCls}`}
            />
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm ${selectCls}`}
            >
              <option value="">All staff</option>
              {assignees.filter(Boolean).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm ${selectCls}`}
            >
              <option value="">All depts</option>
              {depts.filter(Boolean).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm ${selectCls}`}
            >
              <option value="">All status</option>
              <option value="open">Open only</option>
              <option value="done">Done only</option>
            </select>
            {(assignee || dept || status || search) && (
              <button
                type="button"
                onClick={() => { setAssignee(''); setDept(''); setStatus(''); setSearch('') }}
                className={`rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-[#2a2a2a] text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className={`rounded-xl border ${cardBg} overflow-hidden`}>
          {filtered.length === 0 ? (
            <p className={`px-6 py-12 text-center text-sm ${mutedText}`}>No tasks match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-left text-[0.65rem] uppercase tracking-[0.1em] ${thCls}`}>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Dept</th>
                    <th className="px-4 py-3">Particulars</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Charged</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {filtered.map((t) => (
                    <tr key={t.id} className={`transition ${rowHover}`}>
                      <td className={`px-4 py-3 font-mono text-xs ${tdCls}`}>
                        {t.invoiceNo ? (
                          <Link href={`/invoices/${t.invoice_id}`} className="text-teal-500 hover:underline">
                            {t.invoiceNo}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className={`px-4 py-3 max-w-[140px] truncate ${tdCls}`}>{t.clientName ?? '—'}</td>
                      <td className={`px-4 py-3 font-mono text-xs font-semibold ${tdCls}`}>{t.dept ?? '—'}</td>
                      <td className={`px-4 py-3 max-w-[220px] ${tdCls}`}>
                        <p className="truncate">{t.particulars ?? '—'}</p>
                        {t.notes && <p className={`mt-0.5 text-xs truncate ${mutedText}`}>{t.notes}</p>}
                      </td>
                      <td className={`px-4 py-3 ${tdCls}`}>{t.assigned_to?.trim() || <span className={mutedText}>Unassigned</span>}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${tdCls}`}>{t.task_date ?? t.created_at?.slice(0, 10) ?? '—'}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${tdCls}`}>
                        {t.charged != null ? t.charged.toFixed(2) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${tdCls}`}>
                        {t.paid != null ? t.paid.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
