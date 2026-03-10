export type CalendarDay = {
  dayNumber: number
  iso: string
  weekdayLabel: string
}

export function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

export function normalizeWeekdayLabel(label: string) {
  return label.replace('.', '').slice(0, 3).toUpperCase()
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildDateFromSlot(dayIso: string, hour: number, minute = 0) {
  const [year, month, day] = dayIso.split('-').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

export function formatLocalDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function parseLocalDateTime(value: string) {
  const [datePart, timePart] = value.split(/[T ]/)
  if (!datePart || !timePart) {
    return null
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)

  if (
    Number.isNaN(year)
    || Number.isNaN(month)
    || Number.isNaN(day)
    || Number.isNaN(hours)
    || Number.isNaN(minutes)
  ) {
    return null
  }

  return new Date(year, month - 1, day, hours, minutes)
}

export function parseTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return { hours, minutes }
}

export function isValidTime(value: string) {
  return Boolean(parseTime(value))
}

export function addMinutesToTime(value: string, minutesToAdd: number) {
  const parsed = parseTime(value)
  if (!parsed) {
    return ''
  }

  const date = new Date(0, 0, 0, parsed.hours, parsed.minutes)
  date.setMinutes(date.getMinutes() + minutesToAdd)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function slotKey(dayIso: string, hour: number) {
  return `${dayIso}-${hour}`
}

export function slotKeyFromTime(timeFrom: string) {
  const [datePart, timePart] = timeFrom.split(/[T ]/)
  if (!datePart || !timePart) {
    return null
  }

  const hour = Number(timePart.slice(0, 2))
  if (Number.isNaN(hour)) {
    return null
  }

  return slotKey(datePart, hour)
}
