import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import type { Level, User } from '@/types'
import { cn } from '@/lib/cn'

// Badges, avatars and progress indicators. Status colors are CSS tokens and
// every badge carries a text label, so state is never conveyed by color alone.

export type Meta = { label: string; color: string }

export function Badge({ color, children, className, dot = true, title }: { color?: string; children: ReactNode; className?: string; dot?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap', !color && 'bg-surface-3 text-muted', className)}
      style={color ? { background: `color-mix(in oklab, ${color} 13%, transparent)`, color: `color-mix(in oklab, ${color} 72%, var(--ink))` } : undefined}
    >
      {dot && color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  )
}

export const StatusBadge = ({ meta, title }: { meta: Meta; title?: string }) => <Badge color={meta.color} title={title}>{meta.label}</Badge>

export const levelMeta: Record<Level, Meta & { bars: number }> = {
  beginner: { label: 'Beginner', color: 'var(--success)', bars: 1 },
  intermediate: { label: 'Intermediate', color: 'var(--secondary)', bars: 2 },
  advanced: { label: 'Advanced', color: 'var(--highlight)', bars: 3 },
}

/** Three-bar difficulty glyph + label. */
export function LevelTag({ level, className }: { level: Level; className?: string }) {
  const m = levelMeta[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted', className)}>
      <span className="inline-flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span key={b} className="w-[3px] rounded-sm" style={{ height: 4 + b * 3, background: b <= m.bars ? m.color : 'var(--line-strong)' }} />
        ))}
      </span>
      {m.label}
    </span>
  )
}

export const initials = (name: string) =>
  name
    .replace(/^(Dr|Prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')

export function Avatar({ user, name, color, size = 'md', className }: { user?: Pick<User, 'name' | 'color' | 'avatar'>; name?: string; color?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const n = user?.name ?? name ?? '?'
  const sz = { xs: 'size-5 text-[9px]', sm: 'size-7 text-[10px]', md: 'size-8 text-xs', lg: 'size-11 text-sm', xl: 'size-20 text-2xl' }[size]
  if (user?.avatar) return <img src={user.avatar} alt="" className={cn('shrink-0 rounded-full object-cover', sz, className)} />
  return (
    <span className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold text-white', sz, className)} style={{ background: user?.color ?? color ?? 'var(--primary)' }} aria-hidden>
      {initials(n)}
    </span>
  )
}

export function Progress({ value, color, className, label }: { value: number; color?: string; className?: string; label: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? (value >= 100 ? 'var(--success)' : 'var(--primary)') }} />
    </div>
  )
}

/** Circular progress with the percentage in the middle. */
export function ProgressRing({ value, size = 56, stroke = 5, label, children }: { value: number; size?: number; stroke?: number; label: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={v >= 100 ? 'var(--success)' : 'var(--primary)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <span className="absolute text-[11px] font-semibold text-ink tabular">{children ?? `${Math.round(v)}%`}</span>
    </div>
  )
}

export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!count && count !== undefined) return <span className={cn('text-xs text-faint', className)}>No ratings yet</span>
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)} aria-label={`Rated ${value.toFixed(1)} out of 5${count !== undefined ? ` from ${count} reviews` : ''}`}>
      <Star className="size-3.5 fill-highlight text-highlight" aria-hidden />
      <span className="font-semibold text-ink tabular">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-faint tabular">({count})</span>}
    </span>
  )
}
