'use client'

import Link from 'next/link'
import { startTransition, useState } from 'react'
import type { DailyWorkItem } from '@/lib/daily-works'

type ApiPayload = {
  date?: string
  error?: string
  items?: DailyWorkItem[]
}

const DEPARTMENT_ORDER = ['MOHRE', 'GDRFA', 'AMER', 'DUBINS', 'ICP', 'ILOE', 'MEDICAL', 'NOTARY', 'DET', 'OTHER']
const DEPARTMENT_ROW_STYLES: Record<string, string> = {
  MOHRE: 'bg-[#fdebd1] hover:bg-[#f9dfb3]',
  GDRFA: 'bg-[#f8e6c7] hover:bg-[#f0d6a5]',
  AMER: 'bg-[#f6efd2] hover:bg-[#ede2b4]',
  DUBINS: 'bg-[#eef1c9] hover:bg-[#e4e8a6]',
  ICP: 'bg-[#dff0cf] hover:bg-[#d0e7b6]',
  ILOE: 'bg-[#d8efc2] hover:bg-[#c8e4ab]',
  MEDICAL: 'bg-[#d4ebc8] hover:bg-[#c2dfb3]',
  NOTARY: 'bg-[#e2e8d6] hover:bg-[#d7deca]',
  DET: 'bg-[#ece3cf] hover:bg-[#e0d4bb]',
  OTHER: 'bg-[#eef1f5] hover:bg-[#e4e7ec]',
}
const MODE_ORDER = ['RAK Debit', 'Noqodi', 'Online', 'Cash', 'Cheque']

type SummaryRow = {
  label: string
  charged: number
  paid: number
  outstanding: number
}

function formatCurrency(amount: number | null) {
  return `AED ${(amount ?? 0).toFixed(2)}`
}

function formatWorksheetAmount(amount: number | null) {
  return (amount ?? 0).toFixed(2)
}

function formatWorksheetDate(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate)
}

function formatDayName(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(parsedDate)
}

function getStatusLabel(status: string | null) {
  const normalized = (status ?? 'Pending').trim()
  return normalized.length > 0 ? normalized.toLowerCase() : 'pending'
}

function getStatusClasses(status: string | null) {
  switch (status) {
    case 'Done':
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800'
    case 'Paid':
      return 'bg-sky-100 text-sky-800'
    case 'On Account':
      return 'bg-amber-100 text-amber-800'
    case 'Pending':
      return 'bg-slate-200 text-slate-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getDepartmentSortValue(value: string | null) {
  const department = value ?? 'OTHER'
  const index = DEPARTMENT_ORDER.indexOf(department)
  return index === -1 ? DEPARTMENT_ORDER.length : index
}

function sortDailyWorks(items: DailyWorkItem[]) {
  return [...items].sort((left, right) => {
    const departmentDifference = getDepartmentSortValue(left.dept) - getDepartmentSortValue(right.dept)
    if (departmentDifference !== 0) {
      return departmentDifference
    }

    const leftClient = left.client_name ?? ''
    const rightClient = right.client_name ?? ''
    if (leftClient !== rightClient) {
      return leftClient.localeCompare(rightClient)
    }

    const leftPerson = left.beneficiary_name ?? ''
    const rightPerson = right.beneficiary_name ?? ''
    if (leftPerson !== rightPerson) {
      return leftPerson.localeCompare(rightPerson)
    }

    return (left.task ?? '').localeCompare(right.task ?? '')
  })
}

function buildServiceOrderLabel(item: DailyWorkItem) {
  if (item.service_orders.length === 0) {
    return 'No service order linked'
  }

  return item.service_orders.join(' / ')
}

function buildDepartmentSummaries(items: DailyWorkItem[]) {
  const summaryMap = new Map<string, SummaryRow>()

  for (const item of items) {
    const label = item.dept ?? 'OTHER'
    const current = summaryMap.get(label) ?? { label, charged: 0, paid: 0, outstanding: 0 }
    current.charged += item.charged ?? 0
    current.paid += item.paid ?? 0
    current.outstanding += Math.max(item.difference, 0)
    summaryMap.set(label, current)
  }

  return [...summaryMap.values()].sort((left, right) => getDepartmentSortValue(left.label) - getDepartmentSortValue(right.label))
}

function buildModeSummaries(items: DailyWorkItem[]) {
  const summaryMap = new Map<string, number>()

  for (const item of items) {
    const label = item.payment_mode ?? 'Unspecified'
    summaryMap.set(label, (summaryMap.get(label) ?? 0) + (item.paid ?? 0))
  }

  return [...summaryMap.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((left, right) => {
      const leftIndex = MODE_ORDER.indexOf(left.label)
      const rightIndex = MODE_ORDER.indexOf(right.label)
      const normalizedLeft = leftIndex === -1 ? MODE_ORDER.length : leftIndex
      const normalizedRight = rightIndex === -1 ? MODE_ORDER.length : rightIndex
      return normalizedLeft - normalizedRight || left.label.localeCompare(right.label)
    })
}

function buildTopModeSummaries(items: DailyWorkItem[]) {
  return buildModeSummaries(items).slice(0, 4)
}

function getAssigneeLabel(value: string | null) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : 'Unassigned'
}

function SummaryTable({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`border border-slate-300 bg-white ${className}`.trim()}>
      <div className="bg-[#d8dfef] px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-slate-700">
        {title}
      </div>
      {children}
    </section>
  )
}

export default function DailyWorksPageClient({
  initialDate,
  initialItems,
  initialAssigneeFilter,
  initialDepartmentFilter,
  preparedByLabel,
  reviewedByLabel,
}: {
  initialDate: string
  initialItems: DailyWorkItem[]
  initialAssigneeFilter: string
  initialDepartmentFilter: string
  preparedByLabel: string
  reviewedByLabel: string
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [items, setItems] = useState(initialItems)
  const [assigneeFilter, setAssigneeFilter] = useState(initialAssigneeFilter)
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartmentFilter)
  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState('')

  const filteredItems = sortDailyWorks(
    items.filter((item) =>
      (!assigneeFilter || getAssigneeLabel(item.assigned_to) === assigneeFilter) &&
      (!departmentFilter || (item.dept ?? 'OTHER') === departmentFilter)
    )
  )
  const departmentSummaries = buildDepartmentSummaries(filteredItems)
  const modeSummaries = buildModeSummaries(filteredItems)
  const topModeSummaries = buildTopModeSummaries(filteredItems)
  const totalCharged = filteredItems.reduce((sum, item) => sum + (item.charged ?? 0), 0)
  const totalPaid = filteredItems.reduce((sum, item) => sum + (item.paid ?? 0), 0)
  const totalOutstanding = filteredItems.reduce((sum, item) => sum + Math.max(item.difference, 0), 0)
  const pendingCount = filteredItems.filter((item) => (item.status ?? 'Pending') === 'Pending').length
  const dayName = formatDayName(selectedDate)

  async function loadDailyWorks(dateValue: string) {
    setSelectedDate(dateValue)
    setLoading(true)
    setPageError('')

    try {
      const response = await fetch(`/api/daily-works?date=${encodeURIComponent(dateValue)}`, {
        method: 'GET',
      })
      const payload = (await response.json().catch(() => ({}))) as ApiPayload

      if (!response.ok) {
        setPageError(payload.error ?? 'Unable to load the daily works right now.')
        return
      }

      startTransition(() => {
        setItems(payload.items ?? [])
      })
    } catch {
      setPageError('Unable to load the daily works right now.')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

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

          .no-print {
            display: none !important;
          }

          .print-root {
            min-height: auto !important;
            background: #ffffff !important;
          }

          .print-shell {
            max-width: none !important;
            padding: 0 !important;
          }

          .worksheet-scroll {
            overflow: visible !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .worksheet-canvas {
            min-width: 0 !important;
            width: 100% !important;
          }

          .worksheet-card {
            border: none !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }

          .worksheet-table {
            font-size: 10px !important;
          }

          .worksheet-summary-table {
            font-size: 9.5px !important;
          }

          .worksheet-table th,
          .worksheet-table td,
          .worksheet-summary-table th,
          .worksheet-summary-table td {
            padding: 2px 4px !important;
          }
        }
      `}</style>

      <div className="print-root min-h-screen bg-[radial-gradient(circle_at_top,#f8fbff_0%,#eef3fb_40%,#e5edf9_100%)]">
      <div className="print-shell mx-auto max-w-[1480px] px-3 py-4 lg:px-5 lg:py-5">
        <div className="no-print mb-4 flex flex-col gap-3 rounded-[26px] border border-white/80 bg-white/75 px-4 py-4 shadow-[0_26px_70px_rgba(15,23,42,0.08)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Daily Works</h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-sm font-medium text-slate-600">
              <span className="mb-1 block">Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => void loadDailyWorks(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
            <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {loading
                ? 'Loading worksheet…'
                : `${filteredItems.length} tasks · ${pendingCount} pending${assigneeFilter ? ` · ${assigneeFilter}` : ''}${departmentFilter ? ` · ${departmentFilter}` : ''}`}
            </div>
            {assigneeFilter || departmentFilter ? (
              <button
                type="button"
                onClick={() => {
                  setAssigneeFilter('')
                  setDepartmentFilter('')
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear Filters
              </button>
            ) : null}
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl bg-[#274a71] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(39,74,113,0.24)] transition hover:brightness-110"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {pageError ? (
          <div className="no-print mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        {assigneeFilter || departmentFilter ? (
          <div className="no-print mb-4 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span>
              Showing tasks
              {assigneeFilter ? <> for <strong>{assigneeFilter}</strong></> : null}
              {departmentFilter ? <> in <strong>{departmentFilter}</strong></> : null}
              {' '}on {formatWorksheetDate(selectedDate)}.
            </span>
            <button
              type="button"
              onClick={() => {
                setAssigneeFilter('')
                setDepartmentFilter('')
              }}
              className="font-medium text-blue-700 hover:text-blue-900"
            >
              Show all tasks
            </button>
          </div>
        ) : null}

        <div className="worksheet-scroll overflow-x-auto rounded-[26px] border border-slate-300 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="worksheet-canvas min-w-[1240px]">
            <div className="worksheet-card border border-slate-300">
              <div className="bg-[#274a71] px-3 py-1.5 text-center text-sm font-bold uppercase tracking-[0.16em] text-white">
                Daily Worksheet - Operations & Payments
              </div>

              <div className="border-t border-slate-300 p-2">
                <div className="flex flex-col gap-2 xl:flex-row xl:flex-nowrap xl:items-start print:flex-row print:flex-nowrap print:items-start">
                  <div className="w-full xl:w-[520px] xl:shrink-0 print:w-[520px] print:shrink-0">
                    <table className="worksheet-summary-table w-full border-collapse text-[0.72rem]">
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 bg-[#f1f3f7] px-2 py-1 font-semibold text-slate-700">Date</td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-900">{formatWorksheetDate(selectedDate)}</td>
                          <td className="border border-slate-300 bg-[#f1f3f7] px-2 py-1 font-semibold text-slate-700">Day</td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-900">{dayName}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 bg-[#f1f3f7] px-2 py-1 font-semibold text-slate-700">Prepared By</td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-900">{preparedByLabel}</td>
                          <td className="border border-slate-300 bg-[#f1f3f7] px-2 py-1 font-semibold text-slate-700">Reviewed By</td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-900">{reviewedByLabel}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-start xl:w-auto xl:shrink-0 print:flex-row print:flex-nowrap print:items-start">
                    <SummaryTable title="Payment Snapshot" className="w-full md:w-[300px] md:shrink-0 print:w-[300px] print:shrink-0">
                      <table className="worksheet-summary-table w-full table-fixed border-collapse text-[0.68rem]">
                        <tbody>
                          {topModeSummaries.length === 0 ? (
                            <tr>
                              <td className="border border-slate-300 px-2 py-1 text-slate-500" colSpan={2}>No paid modes for this date.</td>
                            </tr>
                          ) : (
                            topModeSummaries.map((row) => (
                              <tr key={row.label}>
                                <td className="border border-slate-300 px-2 py-1 text-slate-700">{row.label}</td>
                                <td className="border border-slate-300 px-2 py-1 text-right font-medium text-slate-900">{formatWorksheetAmount(row.amount)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </SummaryTable>

                    <SummaryTable title="Daily Totals" className="w-full md:w-[280px] md:shrink-0 print:w-[280px] print:shrink-0">
                      <table className="worksheet-summary-table w-full table-fixed border-collapse text-[0.68rem]">
                        <tbody>
                          <tr>
                            <td className="border border-slate-300 px-2 py-1 text-slate-700">Total Charged</td>
                            <td className="border border-slate-300 px-2 py-1 text-right font-medium text-slate-900">{formatWorksheetAmount(totalCharged)}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-300 px-2 py-1 text-slate-700">Total Paid</td>
                            <td className="border border-slate-300 px-2 py-1 text-right font-medium text-slate-900">{formatWorksheetAmount(totalPaid)}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-300 px-2 py-1 text-slate-700">Outstanding</td>
                            <td className="border border-slate-300 px-2 py-1 text-right font-medium text-slate-900">{formatWorksheetAmount(totalOutstanding)}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-300 px-2 py-1 text-slate-700">Transactions</td>
                            <td className="border border-slate-300 px-2 py-1 text-right font-medium text-slate-900">{filteredItems.length}</td>
                          </tr>
                        </tbody>
                      </table>
                    </SummaryTable>
                  </div>
                </div>
              </div>

              <div className="px-2 pb-2 text-[0.63rem] italic text-slate-500">
                Tip: change the date from above to instantly load a different daily worksheet.
              </div>
            </div>

            <div className="mt-3 border border-slate-300">
              <div className="bg-[#d8dfef] px-3 py-1 text-center text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-700">
                Daily Transactions
              </div>

              {filteredItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No daily tasks were found for {formatWorksheetDate(selectedDate)}
                  {assigneeFilter ? ` for ${assigneeFilter}` : ''}
                  {departmentFilter ? `${assigneeFilter ? ' in' : ' for'} ${departmentFilter}` : ''}.
                </div>
              ) : (
                <table className="worksheet-table w-full border-collapse text-[0.72rem]">
                  <thead>
                    <tr className="bg-[#f1f3f7] text-slate-700">
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Dept</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Ref No</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Particulars</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Client / Company</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Person / Staff</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Status</th>
                      <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Charged (AED)</th>
                      <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Paid (AED)</th>
                      <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Diff (AED)</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Mode</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Payment Ref</th>
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className={DEPARTMENT_ROW_STYLES[item.dept ?? 'OTHER'] ?? DEPARTMENT_ROW_STYLES.OTHER}>
                        <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">{item.dept || 'OTHER'}</td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-700">
                          {item.invoice_id ? (
                            <Link href={`/invoices/${item.invoice_id}`} className="font-medium text-blue-800 hover:underline">
                              {item.invoice_no || 'Open'}
                            </Link>
                          ) : (
                            item.invoice_no || '—'
                          )}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-800">
                          <div className="font-medium">{item.task || 'Untitled task'}</div>
                          <div className="text-[0.64rem] text-slate-600">{buildServiceOrderLabel(item)}</div>
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-800">
                          <div className="font-medium">{item.client_name || 'Unknown client'}</div>
                          <div className="text-[0.64rem] text-slate-600">{item.invoice_status || 'Invoice'}{item.invoice_date ? ` · ${formatWorksheetDate(item.invoice_date)}` : ''}</div>
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-800">
                          <div>{item.beneficiary_name || '—'}</div>
                          <div className="text-[0.64rem] text-slate-600">{getAssigneeLabel(item.assigned_to)}</div>
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-800">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.64rem] font-semibold ${getStatusClasses(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-medium text-slate-900">{formatWorksheetAmount(item.charged)}</td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-medium text-slate-900">{formatWorksheetAmount(item.paid)}</td>
                        <td className={`border border-slate-300 px-2 py-1 text-right font-semibold ${item.difference > 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                          {formatWorksheetAmount(item.difference)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-800">{item.payment_mode || '—'}</td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-800">{item.ref_no || '—'}</td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-700">{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-start print:flex-row print:flex-nowrap print:items-start">
              <SummaryTable title="Department Summary" className="w-full md:w-[430px] md:shrink-0 print:w-[430px] print:shrink-0">
                <table className="worksheet-summary-table w-full table-fixed border-collapse text-[0.68rem]">
                  <thead>
                    <tr className="bg-[#f1f3f7] text-slate-700">
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Dept</th>
                      <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Charged</th>
                      <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Paid</th>
                      <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentSummaries.map((row) => (
                      <tr key={row.label}>
                        <td className="border border-slate-300 px-2 py-1 text-slate-800">{row.label}</td>
                        <td className="border border-slate-300 px-2 py-1 text-right text-slate-900">{formatWorksheetAmount(row.charged)}</td>
                        <td className="border border-slate-300 px-2 py-1 text-right text-slate-900">{formatWorksheetAmount(row.paid)}</td>
                        <td className="border border-slate-300 px-2 py-1 text-right text-slate-900">{formatWorksheetAmount(row.outstanding)}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#f1f3f7] font-semibold text-slate-900">
                      <td className="border border-slate-300 px-2 py-1">Total</td>
                      <td className="border border-slate-300 px-2 py-1 text-right">{formatWorksheetAmount(totalCharged)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right">{formatWorksheetAmount(totalPaid)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right">{formatWorksheetAmount(totalOutstanding)}</td>
                    </tr>
                  </tbody>
                </table>
              </SummaryTable>

              <SummaryTable title="Payment Mode Summary (Paid)" className="w-full md:w-[410px] md:shrink-0 print:w-[410px] print:shrink-0">
                <table className="worksheet-summary-table w-full table-fixed border-collapse text-[0.68rem]">
                  <thead>
                    <tr className="bg-[#f1f3f7] text-slate-700">
                      <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Mode</th>
                      <th className="border border-slate-300 px-2 py-1 text-right font-semibold">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modeSummaries.length === 0 ? (
                      <tr>
                        <td className="border border-slate-300 px-2 py-1 text-slate-500" colSpan={2}>No paid entries.</td>
                      </tr>
                    ) : (
                      modeSummaries.map((row) => (
                        <tr key={row.label}>
                          <td className="border border-slate-300 px-2 py-1 text-slate-800">{row.label}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right text-slate-900">{formatWorksheetAmount(row.amount)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-[#f1f3f7] font-semibold text-slate-900">
                      <td className="border border-slate-300 px-2 py-1">Total</td>
                      <td className="border border-slate-300 px-2 py-1 text-right">{formatWorksheetAmount(totalPaid)}</td>
                    </tr>
                  </tbody>
                </table>
              </SummaryTable>
            </div>

            <div className="mt-3 grid gap-3 lg:hidden">
              {filteredItems.map((item) => (
                <article key={`${item.id}-mobile`} className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.dept || 'OTHER'}</p>
                      <p className="mt-1 font-semibold text-slate-900">{item.task || 'Untitled task'}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.64rem] font-semibold ${getStatusClasses(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.client_name || 'Unknown client'} · {item.beneficiary_name || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">{buildServiceOrderLabel(item)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 px-2 py-2">
                      <p className="text-slate-400">Charged</p>
                      <p className="font-semibold text-slate-900">{formatWorksheetAmount(item.charged)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2">
                      <p className="text-slate-400">Paid</p>
                      <p className="font-semibold text-slate-900">{formatWorksheetAmount(item.paid)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2">
                      <p className="text-slate-400">Mode</p>
                      <p className="font-semibold text-slate-900">{item.payment_mode || '—'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2">
                      <p className="text-slate-400">Diff</p>
                      <p className={`font-semibold ${item.difference > 0 ? 'text-red-700' : 'text-emerald-800'}`}>{formatWorksheetAmount(item.difference)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Summary: {filteredItems.length} transactions · {formatCurrency(totalCharged)} charged · {formatCurrency(totalPaid)} paid · {formatCurrency(totalOutstanding)} outstanding.
        </div>
      </div>
    </div>
    </>
  )
}
