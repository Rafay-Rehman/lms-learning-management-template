import type { DateString } from '@/types'

// Calendar dates are handled as local-time `YYYY-MM-DD` strings so they never
// shift across time zones. Only timestamps (createdAt, time entries) use full ISO.

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateString(d: Date): DateString {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDate(s: DateString): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = (): DateString => toDateString(new Date())

export function addDays(s: DateString, n: number): DateString {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateString(d)
}

export function addMonths(s: DateString, n: number): DateString {
  const d = parseDate(s)
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  return toDateString(d)
}

/** Whole days from a to b (b − a). */
export function diffDays(a: DateString, b: DateString): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
}

export function startOfWeek(s: DateString, weekStartsOn: 0 | 1 = 1): DateString {
  const d = parseDate(s)
  const offset = (d.getDay() - weekStartsOn + 7) % 7
  return addDays(s, -offset)
}

export function startOfMonth(s: DateString): DateString {
  return s.slice(0, 8) + '01'
}

export function daysInMonth(s: DateString): number {
  const d = parseDate(s)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export const isWeekend = (s: DateString) => [0, 6].includes(parseDate(s).getDay())

export function formatDate(s: DateString | null | undefined, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  if (!s) return '—'
  const d = parseDate(s)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, sameYear || 'year' in opts ? opts : { ...opts, year: 'numeric' })
}

/** "Today", "Tomorrow", "In 3 days", "2 days ago" — or a short date beyond a week. */
export function relativeDay(s: DateString | null): string {
  if (!s) return 'No date'
  const n = diffDays(today(), s)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n > 1 && n < 7) return `In ${n} days`
  if (n < -1 && n > -7) return `${-n} days ago`
  return formatDate(s)
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const dateOf = (iso: string): DateString => toDateString(new Date(iso))

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** 90 → "1h 30m" */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function range(from: DateString, to: DateString): DateString[] {
  const out: DateString[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
