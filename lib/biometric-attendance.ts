const DEFAULT_BIOMETRIC_BASE_URL = 'http://10.39.1.200'

export type BiometricDeviceUser = {
  internalUid: string
  deviceUserId: string
  name: string
  department: string | null
  card: string | null
  group: string | null
  privilege: string | null
}

type RawDownloadRow = {
  deviceUserId: string
  name: string
  timestamp: string
  punchCode: string | null
  verificationCode: string | null
}

export type AttendancePunchEvent = {
  date: string
  deviceUserId: string
  internalUid: string | null
  name: string
  time: string
  status: string
  verification: string
}

export type DailyAttendancePerson = {
  date: string
  deviceUserId: string
  internalUid: string | null
  name: string
  firstPunch: string | null
  lastPunch: string | null
  punchCount: number
  hasOpenSession: boolean
  statusLabels: string[]
  verificationModes: string[]
  slots: string[]
  timeline: AttendancePunchEvent[]
}

export type MonthlyAttendanceDay = {
  date: string
  firstPunch: string | null
  lastPunch: string | null
  punchCount: number
  hasOpenSession: boolean
}

export type MonthlyAttendancePerson = {
  deviceUserId: string
  internalUid: string | null
  name: string
  presentDays: number
  totalPunches: number
  firstSeenDate: string | null
  lastSeenDate: string | null
  latestPunch: string | null
  hasOpenSessions: boolean
  dayRecords: MonthlyAttendanceDay[]
}

export type DailyAttendanceResult = {
  date: string
  users: BiometricDeviceUser[]
  people: DailyAttendancePerson[]
  events: AttendancePunchEvent[]
}

export type MonthlyAttendanceResult = {
  month: string
  startDate: string
  endDate: string
  users: BiometricDeviceUser[]
  people: MonthlyAttendancePerson[]
}

type AttendanceFetchOptions = {
  downloadUids?: string[]
}

function getBiometricConfig() {
  const baseUrl = (process.env.BIOMETRIC_DEVICE_BASE_URL?.trim() || DEFAULT_BIOMETRIC_BASE_URL).replace(/\/+$/, '')

  return {
    baseUrl,
  }
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)

  if (!year || !month || month < 1 || month > 12) {
    throw new Error('Invalid month value.')
  }

  const startDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`
  const endDateObject = new Date(Date.UTC(year, month, 0))
  const endDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${endDateObject.getUTCDate().toString().padStart(2, '0')}`

  return { endDate, startDate }
}

function getTimestampParts(timestamp: string) {
  const normalized = timestamp.trim()
  const [date = '', time = ''] = normalized.split(/\s+/, 2)
  return {
    date,
    time,
  }
}

function getHumanPunchLabel(rawCode: string | null) {
  if (!rawCode) {
    return 'Punch'
  }

  return `Punch ${rawCode}`
}

function getHumanVerificationLabel(rawCode: string | null) {
  if (!rawCode) {
    return 'Biometric'
  }

  return `Mode ${rawCode}`
}

function normalizeTime(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function sortEvents(events: AttendancePunchEvent[]) {
  return [...events].sort((left, right) => {
    const leftKey = `${left.date} ${left.time}`
    const rightKey = `${right.date} ${right.time}`
    return leftKey.localeCompare(rightKey) || left.deviceUserId.localeCompare(right.deviceUserId)
  })
}

function parseRawDownloadRows(rawText: string) {
  const rows: RawDownloadRow[] = []

  for (const line of rawText.split(/\r?\n/)) {
    const normalizedLine = line.trim()
    if (!normalizedLine) {
      continue
    }

    const parts = normalizedLine.split('\t')
    if (parts.length < 3) {
      continue
    }

    rows.push({
      deviceUserId: parts[0]?.trim() ?? '',
      name: parts[1]?.trim() ?? '',
      timestamp: parts[2]?.trim() ?? '',
      punchCode: parts[3]?.trim() || null,
      verificationCode: parts[4]?.trim() || null,
    })
  }

  return rows.filter((row) => row.deviceUserId && row.timestamp)
}

async function downloadAttendanceRows(startDate: string, endDate: string, deviceUserIds: string[]) {
  const { baseUrl } = getBiometricConfig()
  const formData = new URLSearchParams()

  formData.set('sdate', startDate)
  formData.set('edate', endDate)
  formData.set('period', '1')

  for (const deviceUserId of deviceUserIds) {
    formData.append('uid', deviceUserId)
  }

  const response = await fetch(`${baseUrl}/form/Download`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error('Unable to download attendance data from the biometric device.')
  }

  if (text.includes("self.location.href='/'") || /<html/i.test(text)) {
    throw new Error('Biometric device returned an unexpected login page instead of attendance data.')
  }

  return parseRawDownloadRows(text)
}

function buildDeviceUsers(rows: RawDownloadRow[], requestedDeviceUserIds: string[]) {
  const namesByDeviceUserId = new Map<string, string>()

  for (const row of rows) {
    if (!namesByDeviceUserId.has(row.deviceUserId) && row.name) {
      namesByDeviceUserId.set(row.deviceUserId, row.name)
    }
  }

  const orderedIds =
    requestedDeviceUserIds.length > 0
      ? requestedDeviceUserIds
      : [...new Set(rows.map((row) => row.deviceUserId))]

  return orderedIds.map((deviceUserId) => ({
    internalUid: deviceUserId,
    department: null,
    deviceUserId,
    name: namesByDeviceUserId.get(deviceUserId) ?? deviceUserId,
    card: null,
    group: null,
    privilege: null,
  })) satisfies BiometricDeviceUser[]
}

function buildEvents(rows: RawDownloadRow[], usersByDeviceId: Map<string, BiometricDeviceUser>) {
  const events = rows.map((row) => {
    const matchedUser = usersByDeviceId.get(row.deviceUserId)
    const { date, time } = getTimestampParts(row.timestamp)

    return {
      date,
      deviceUserId: row.deviceUserId,
      internalUid: matchedUser?.internalUid ?? row.deviceUserId,
      name: row.name || matchedUser?.name || row.deviceUserId,
      status: getHumanPunchLabel(row.punchCode),
      time,
      verification: getHumanVerificationLabel(row.verificationCode),
    } satisfies AttendancePunchEvent
  })

  return sortEvents(events)
}

export function normalizeAttendanceDate(value: string | null | undefined) {
  const today = new Date()
  const localTime = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
  const fallback = localTime.toISOString().slice(0, 10)

  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback
  }

  return value
}

export function normalizeAttendanceMonth(value: string | null | undefined) {
  const today = new Date()
  const localTime = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
  const fallback = localTime.toISOString().slice(0, 7)

  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return fallback
  }

  return value
}

export async function getDailyAttendance(dateValue: string, options?: AttendanceFetchOptions) {
  const date = normalizeAttendanceDate(dateValue)
  const requestedDownloadUids = options?.downloadUids ?? []
  const rows = await downloadAttendanceRows(date, date, requestedDownloadUids)
  const users = buildDeviceUsers(rows, [])
  const usersByDeviceId = new Map(users.map((user) => [user.deviceUserId, user] as const))
  const events = buildEvents(rows, usersByDeviceId)
  const eventsByDeviceUserId = new Map<string, AttendancePunchEvent[]>()

  for (const event of events) {
    const key = `${event.deviceUserId}:${event.date}`
    const current = eventsByDeviceUserId.get(key) ?? []
    current.push(event)
    eventsByDeviceUserId.set(key, current)
  }

  const people = [...eventsByDeviceUserId.entries()]
    .map(([key, timeline]) => {
      const [deviceUserId, entryDate] = key.split(':')
      const matchedUser = usersByDeviceId.get(deviceUserId)
      const firstPunch = normalizeTime(timeline[0]?.time)
      const lastPunch = normalizeTime(timeline[timeline.length - 1]?.time)
      const statuses = [...new Set(timeline.map((event) => event.status).filter(Boolean))]
      const verificationModes = [...new Set(timeline.map((event) => event.verification).filter(Boolean))]

      return {
        date: entryDate,
        deviceUserId,
        firstPunch,
        hasOpenSession: timeline.length > 0 && timeline.length % 2 === 1,
        internalUid: matchedUser?.internalUid ?? deviceUserId,
        lastPunch,
        name: matchedUser?.name ?? timeline[0]?.name ?? deviceUserId,
        punchCount: timeline.length,
        slots: timeline.map((event) => event.time).filter(Boolean),
        statusLabels: statuses,
        timeline,
        verificationModes,
      } satisfies DailyAttendancePerson
    })
    .sort((left, right) => left.name.localeCompare(right.name) || left.deviceUserId.localeCompare(right.deviceUserId))

  return {
    date,
    events,
    people,
    users,
  } satisfies DailyAttendanceResult
}

export async function getMonthlyAttendance(monthValue: string, options?: AttendanceFetchOptions) {
  const month = normalizeAttendanceMonth(monthValue)
  const { startDate, endDate } = getMonthRange(month)
  const requestedDownloadUids = options?.downloadUids ?? []
  const rows = await downloadAttendanceRows(startDate, endDate, requestedDownloadUids)
  const users = buildDeviceUsers(rows, [])
  const usersByDeviceId = new Map(users.map((user) => [user.deviceUserId, user] as const))
  const rowsByDeviceUserId = new Map<string, RawDownloadRow[]>()

  for (const row of rows) {
    const current = rowsByDeviceUserId.get(row.deviceUserId) ?? []
    current.push(row)
    rowsByDeviceUserId.set(row.deviceUserId, current)
  }

  const people = [...rowsByDeviceUserId.entries()]
    .map(([deviceUserId, deviceRows]) => {
      const matchedUser = usersByDeviceId.get(deviceUserId)
      const rowsByDate = new Map<string, RawDownloadRow[]>()

      for (const row of deviceRows) {
        const { date } = getTimestampParts(row.timestamp)
        const current = rowsByDate.get(date) ?? []
        current.push(row)
        rowsByDate.set(date, current)
      }

      const dayRecords = [...rowsByDate.entries()]
        .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
        .map(([date, dateRows]) => {
          const times = dateRows
            .map((row) => getTimestampParts(row.timestamp).time)
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right))

          return {
            date,
            firstPunch: normalizeTime(times[0] ?? null),
            hasOpenSession: times.length > 0 && times.length % 2 === 1,
            lastPunch: normalizeTime(times[times.length - 1] ?? null),
            punchCount: times.length,
          } satisfies MonthlyAttendanceDay
        })

      return {
        dayRecords,
        deviceUserId,
        firstSeenDate: dayRecords[0]?.date ?? null,
        hasOpenSessions: dayRecords.some((row) => row.hasOpenSession),
        internalUid: matchedUser?.internalUid ?? deviceUserId,
        lastSeenDate: dayRecords[dayRecords.length - 1]?.date ?? null,
        latestPunch: dayRecords[dayRecords.length - 1]?.lastPunch ?? null,
        name: matchedUser?.name ?? deviceRows[0]?.name ?? deviceUserId,
        presentDays: dayRecords.length,
        totalPunches: dayRecords.reduce((sum, row) => sum + row.punchCount, 0),
      } satisfies MonthlyAttendancePerson
    })
    .sort((left, right) => left.name.localeCompare(right.name) || left.deviceUserId.localeCompare(right.deviceUserId))

  return {
    endDate,
    month,
    people,
    startDate,
    users,
  } satisfies MonthlyAttendanceResult
}
