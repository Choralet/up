export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Monday = 0 … Sunday = 6, in local time. */
export function weekdayIndex(d: Date = new Date()): number {
  return (d.getDay() + 6) % 7
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return localDate(d)
}

/** The Monday of the week containing `date`. */
export function weekStart(date: string): string {
  return addDays(date, -weekdayIndex(parseDate(date)))
}
