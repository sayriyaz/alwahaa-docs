import type { AppRole } from '@/lib/auth-constants'
import type {
  DailyAttendancePerson,
  DailyAttendanceResult,
  MonthlyAttendancePerson,
  MonthlyAttendanceResult,
} from '@/lib/biometric-attendance'

export type AttendanceAppUser = {
  id: string
  email: string
  full_name: string | null
  role: AppRole
}

export type AttendanceTrackedStaff = {
  appUserId: string | null
  biometricLabel: string
  deviceUserId: string
  downloadUid: string
  email: string | null
  fullName: string
  role: AppRole | null
}

export type AttendanceStatusCode = 'P' | 'A' | 'MP' | 'PN' | '-'

export type AttendanceStatus = {
  code: AttendanceStatusCode
  label: string
}

export type DailyAttendanceRosterEntry = AttendanceTrackedStaff & {
  date: string
  firstPunch: string | null
  lastPunch: string | null
  punchCount: number
  sourcePerson: DailyAttendancePerson | null
  status: AttendanceStatus
}

export type MonthlyAttendanceDayState = {
  date: string
  code: AttendanceStatusCode
  label: string
  firstPunch: string | null
  lastPunch: string | null
  punchCount: number
}

export type MonthlyAttendanceRosterEntry = AttendanceTrackedStaff & {
  counts: {
    absent: number
    missPunch: number
    pending: number
    present: number
  }
  dayStates: MonthlyAttendanceDayState[]
  sourcePerson: MonthlyAttendancePerson | null
}

const TRACKED_STAFF_RULES = [
  {
    biometricLabel: 'Riyaz',
    deviceUserId: '6',
    downloadUid: '6',
    matchers: ['riyaz', 'riyazurrahman', 'sayriyaz'],
  },
  {
    biometricLabel: 'Mohamed',
    deviceUserId: '3',
    downloadUid: '3',
    matchers: ['mohammed', 'mohamed'],
  },
  {
    biometricLabel: 'Meeran',
    deviceUserId: '4',
    downloadUid: '12',
    matchers: ['ahamed meeran', 'meeran'],
  },
  {
    biometricLabel: 'Kogila P',
    deviceUserId: '5',
    downloadUid: '5',
    matchers: ['kogila priya', 'kogila p'],
  },
] as const

const ABSENT_CUTOFF_HOUR = 10
const MISSPUNCH_CUTOFF_HOUR = 19

function normalizeValue(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function getTrackedAttendanceDeviceUserIds() {
  return TRACKED_STAFF_RULES.map((rule) => rule.deviceUserId)
}

export function getTrackedAttendanceDownloadUids() {
  return TRACKED_STAFF_RULES.map((rule) => rule.downloadUid)
}

export function matchTrackedAttendanceStaff(appUsers: AttendanceAppUser[]) {
  return TRACKED_STAFF_RULES.map((rule) => {
    const matchedUser =
      appUsers.find((user) => {
        const normalizedFullName = normalizeValue(user.full_name)
        const normalizedEmail = normalizeValue(user.email)

        return rule.matchers.some((matcher) => {
          const normalizedMatcher = normalizeValue(matcher)
          return (
            normalizedFullName.includes(normalizedMatcher) ||
            normalizedEmail.includes(normalizedMatcher)
          )
        })
      }) ?? null

      return {
        appUserId: matchedUser?.id ?? null,
        biometricLabel: rule.biometricLabel,
        deviceUserId: rule.deviceUserId,
        downloadUid: rule.downloadUid,
        email: matchedUser?.email ?? null,
        fullName: matchedUser?.full_name?.trim() || rule.biometricLabel,
        role: matchedUser?.role ?? null,
    } satisfies AttendanceTrackedStaff
  })
}

function getTodayDateValue(now = new Date()) {
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function getCurrentMinutes(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes()
}

function getDayStatusFromPunchCount({
  date,
  now,
  punchCount,
}: {
  date: string
  now: Date
  punchCount: number
}) {
  const today = getTodayDateValue(now)
  const currentMinutes = getCurrentMinutes(now)

  if (date > today) {
    return {
      code: '-' as const,
      label: 'Future',
    }
  }

  if (punchCount <= 0) {
    if (date === today && currentMinutes < ABSENT_CUTOFF_HOUR * 60) {
      return {
        code: 'PN' as const,
        label: 'Pending',
      }
    }

    return {
      code: 'A' as const,
      label: 'Absent',
    }
  }

  if (punchCount % 2 === 1) {
    if (date < today || currentMinutes >= MISSPUNCH_CUTOFF_HOUR * 60) {
      return {
        code: 'MP' as const,
        label: 'Miss Punch',
      }
    }

    return {
      code: 'P' as const,
      label: 'Present',
    }
  }

  return {
    code: 'P' as const,
    label: 'Present',
  }
}

function getMonthDates(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  if (!year || !month) {
    return []
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    return `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${day}`
  })
}

export function getTrackedStaffForAppUser(trackedStaff: AttendanceTrackedStaff[], appUserId: string) {
  return trackedStaff.find((staff) => staff.appUserId === appUserId) ?? null
}

export function buildDailyAttendanceRoster({
  date,
  dailyAttendance,
  now = new Date(),
  trackedStaff,
}: {
  date: string
  dailyAttendance: DailyAttendanceResult | null
  now?: Date
  trackedStaff: AttendanceTrackedStaff[]
}) {
  const peopleByDeviceId = new Map(
    (dailyAttendance?.people ?? []).map((person) => [person.deviceUserId, person] as const)
  )

  return trackedStaff.map((staff) => {
    const sourcePerson = peopleByDeviceId.get(staff.deviceUserId) ?? null
    const punchCount = sourcePerson?.punchCount ?? 0

    return {
      ...staff,
      date,
      firstPunch: sourcePerson?.firstPunch ?? null,
      lastPunch: sourcePerson?.lastPunch ?? null,
      punchCount,
      sourcePerson,
      status: getDayStatusFromPunchCount({
        date,
        now,
        punchCount,
      }),
    } satisfies DailyAttendanceRosterEntry
  })
}

export function buildMonthlyAttendanceRoster({
  month,
  monthlyAttendance,
  now = new Date(),
  trackedStaff,
}: {
  month: string
  monthlyAttendance: MonthlyAttendanceResult | null
  now?: Date
  trackedStaff: AttendanceTrackedStaff[]
}) {
  const monthDates = getMonthDates(month)
  const peopleByDeviceId = new Map(
    (monthlyAttendance?.people ?? []).map((person) => [person.deviceUserId, person] as const)
  )

  return trackedStaff.map((staff) => {
    const sourcePerson = peopleByDeviceId.get(staff.deviceUserId) ?? null
    const dayRecordByDate = new Map(
      (sourcePerson?.dayRecords ?? []).map((record) => [record.date, record] as const)
    )

    const dayStates = monthDates.map((date) => {
      const record = dayRecordByDate.get(date)
      const punchCount = record?.punchCount ?? 0
      const status = getDayStatusFromPunchCount({
        date,
        now,
        punchCount,
      })

      return {
        code: status.code,
        date,
        firstPunch: record?.firstPunch ?? null,
        label: status.label,
        lastPunch: record?.lastPunch ?? null,
        punchCount,
      } satisfies MonthlyAttendanceDayState
    })

    return {
      ...staff,
      counts: {
        absent: dayStates.filter((day) => day.code === 'A').length,
        missPunch: dayStates.filter((day) => day.code === 'MP').length,
        pending: dayStates.filter((day) => day.code === 'PN').length,
        present: dayStates.filter((day) => day.code === 'P').length,
      },
      dayStates,
      sourcePerson,
    } satisfies MonthlyAttendanceRosterEntry
  })
}
