// Shared utility functions

export function formatCurrency(amount: number | null): string {
  return `AED ${(amount ?? 0).toFixed(2)}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Not set'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) {
    return 'Not set'
  }

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

export function formatDayName(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown'
  }

  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(parsedDate)
}

export function getTodayDateValue(): string {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

export function getDateOnlyValue(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return value.slice(0, 10)
}

export function getNextDateValue(dateValue: string): string {
  const nextDate = new Date(`${dateValue}T00:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  return nextDate.toISOString().slice(0, 10)
}

export function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

export function compareInvoiceNumbers(leftInvoiceNo: string, rightInvoiceNo: string): number {
  return leftInvoiceNo.localeCompare(rightInvoiceNo, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function getSingleSearchParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getInvoiceStatusLabel(status: string | null): string {
  if (status === 'Draft' || status === 'Pending') {
    return 'Pending'
  }

  return status || 'Unknown'
}

export function getInvoiceStatusClasses(status: string | null): string {
  switch (getInvoiceStatusLabel(status)) {
    case 'Pending':
      return 'bg-slate-100 text-slate-700'
    case 'Active':
      return 'bg-green-50 text-green-700'
    case 'Completed':
      return 'bg-blue-50 text-blue-700'
    case 'Partial':
      return 'bg-amber-50 text-amber-700'
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export function getTaskStatusClasses(status: string | null): string {
  switch (status) {
    case 'On Account':
      return 'bg-amber-50 text-amber-700'
    case 'Paid':
      return 'bg-sky-50 text-sky-700'
    case 'Done':
      return 'bg-emerald-50 text-emerald-700'
    default:
      return 'bg-rose-50 text-rose-700'
  }
}
