'use client'

import Link from 'next/link'
import { startTransition, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildInvoicesHref,
  STATUS_FILTER_OPTIONS,
  PAYMENT_FILTER_OPTIONS,
  type StatusFilter,
  type PaymentFilter,
} from './invoice-query'

const SEARCH_DEBOUNCE_MS = 250

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function InvoicesTableShell({
  activeFilter,
  activeStatusFilter,
  activePaymentFilter,
  children,
  emptyState,
  invoiceNoSortHref,
  searchQuery,
  sortOrder,
}: {
  activeFilter: string
  activeStatusFilter: StatusFilter | ''
  activePaymentFilter: PaymentFilter | ''
  children: React.ReactNode
  emptyState?: React.ReactNode
  invoiceNoSortHref: string
  searchQuery: string
  sortOrder: 'asc' | 'desc'
}) {
  const router = useRouter()
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [queryValue, setQueryValue] = useState(searchQuery)
  const [statusValue, setStatusValue] = useState<StatusFilter | ''>(activeStatusFilter)
  const [paymentValue, setPaymentValue] = useState<PaymentFilter | ''>(activePaymentFilter)

  useEffect(() => {
    setQueryValue(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    setStatusValue(activeStatusFilter)
  }, [activeStatusFilter])

  useEffect(() => {
    setPaymentValue(activePaymentFilter)
  }, [activePaymentFilter])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  function navigate(nextQuery: string, nextStatus: StatusFilter | '', nextPayment: PaymentFilter | '') {
    const href = buildInvoicesHref({
      query: nextQuery.trim() || undefined,
      order: sortOrder,
      filter: activeFilter || undefined,
      status: nextStatus || undefined,
      payment: nextPayment || undefined,
    })

    startTransition(() => {
      router.replace(href, { scroll: false })
    })
  }

  function scheduleSearch(nextQuery: string, nextStatus: StatusFilter | '', nextPayment: PaymentFilter | '') {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      navigate(nextQuery, nextStatus, nextPayment)
    }, SEARCH_DEBOUNCE_MS)
  }

  function handleSearchChange(value: string) {
    setQueryValue(value)
    scheduleSearch(value, statusValue, paymentValue)
  }

  function handleStatusChange(value: string) {
    const nextStatus = (value || '') as StatusFilter | ''
    setStatusValue(nextStatus)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    navigate(queryValue, nextStatus, paymentValue)
  }

  function handlePaymentChange(value: string) {
    const nextPayment = (value || '') as PaymentFilter | ''
    setPaymentValue(nextPayment)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    navigate(queryValue, statusValue, nextPayment)
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xl">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={queryValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search invoices..."
            className="w-full rounded-full bg-white px-11 py-3 text-sm text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 outline-none transition placeholder:text-slate-400 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
        {emptyState ? (
          emptyState
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs uppercase tracking-[0.08em] text-slate-500 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left">
                  <Link
                    href={invoiceNoSortHref}
                    className="inline-flex items-center gap-1 font-semibold transition hover:text-slate-900"
                  >
                    <span>Invoice No</span>
                    <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  </Link>
                </th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Assigned To</th>
                <th className="px-4 py-3 text-left align-top">
                  <div className="flex flex-col gap-2">
                    <span>Status</span>
                    <div className="relative w-[168px]">
                      <select
                        value={statusValue}
                        onChange={(event) => handleStatusChange(event.target.value)}
                        className="w-full appearance-none rounded-full bg-white px-3 py-2 pr-9 text-xs font-medium normal-case tracking-normal text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        <option value="">All</option>
                        {STATUS_FILTER_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left align-top">
                  <div className="flex flex-col gap-2">
                    <span>Payment</span>
                    <div className="relative w-[140px]">
                      <select
                        value={paymentValue}
                        onChange={(event) => handlePaymentChange(event.target.value)}
                        className="w-full appearance-none rounded-full bg-white px-3 py-2 pr-9 text-xs font-medium normal-case tracking-normal text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        <option value="">All</option>
                        {PAYMENT_FILTER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          </table>
        )}
      </div>
    </>
  )
}
