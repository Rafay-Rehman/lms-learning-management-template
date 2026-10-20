import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

/** Metric tile. With `to`, the whole tile links to the filtered page behind the number. */
export function StatCard({ label, value, hint, icon, to, tone }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; to?: string; tone?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && <span className="grid size-8 place-items-center rounded-[var(--r-ctl)] [&_svg]:size-4" style={{ background: `color-mix(in oklab, ${tone ?? 'var(--primary)'} 12%, transparent)`, color: tone ?? 'var(--primary)' }}>{icon}</span>}
      </div>
      <div className="numeral mt-2 text-[1.9rem] leading-none font-semibold text-ink">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </>
  )
  const cls = 'panel block p-4 transition-colors'
  return to ? (
    <Link to={to} className={cn(cls, 'hover:border-primary/40')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6', className)}>{children}</div>
}
