export const CLINIC_TIME_ZONE = 'Asia/Kolkata'

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function getCurrentDateInTimeZone(timeZone = CLINIC_TIME_ZONE): string {
  const parts = getFormatter(timeZone).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

export function getCurrentTimeInTimeZone(timeZone = CLINIC_TIME_ZONE): string {
  const parts = getFormatter(timeZone).formatToParts(new Date())
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function isPastOrCurrentSlotForTimeZone(
  date: string,
  time: string,
  timeZone = CLINIC_TIME_ZONE
): boolean {
  const today = getCurrentDateInTimeZone(timeZone)
  if (date < today) return true
  if (date > today) return false

  const nowTime = getCurrentTimeInTimeZone(timeZone)
  return toMinutes(time) <= toMinutes(nowTime)
}

export function getWeekdayFromISODate(
  date: string,
  timeZone = CLINIC_TIME_ZONE
): string {
  const [year, month, day] = date.split('-').map(Number)
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  })
    .format(utcNoon)
    .toLowerCase()
}
