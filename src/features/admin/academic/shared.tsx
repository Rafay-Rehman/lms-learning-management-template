import type { PeriodStatus } from '@/types'

export const periodMeta: Record<PeriodStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'var(--success)' },
  upcoming: { label: 'Upcoming', color: 'var(--primary)' },
  archived: { label: 'Archived', color: 'var(--faint)' },
}
export const uidOf = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`
