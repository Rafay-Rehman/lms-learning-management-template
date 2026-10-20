import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export function PageHeader({ title, description, actions, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-semibold text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Section({ title, action, children, className, bodyClassName, id }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; id?: string }) {
  return (
    <section id={id} className={cn('panel flex min-w-0 flex-col', className)}>
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </header>
      <div className={cn('min-h-0 flex-1 px-5 pb-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({ icon, title, body, action, className, heading }: { icon: ReactNode; title: string; body?: string; action?: ReactNode; className?: string; heading?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-5">{icon}</div>
      {heading ? <h1 className="font-sans text-lg font-semibold text-ink">{title}</h1> : <p className="font-medium text-ink">{title}</p>}
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; icon?: ReactNode }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-fit max-w-full overflow-x-auto rounded-[var(--r-ctl)] border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors [&_svg]:size-4',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="relative scroll-thin -mb-px flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'relative inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-medium transition-colors',
            value === t.value ? 'text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary' : 'text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-md bg-surface-3 px-1.5 text-[11px] text-muted tabular">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Pagination({ page, pageCount, onPage, total, pageSize }: { page: number; pageCount: number; onPage: (p: number) => void; total: number; pageSize: number }) {
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted">
      <span className="tabular">
        {from}–{Math.min(total, page * pageSize)} of {total}
      </span>
      <div className="flex gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} icon={<ChevronLeft />} />
        <Button size="icon-sm" variant="ghost" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)} icon={<ChevronRight />} />
      </div>
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border border-line bg-surface-2 px-1 font-sans text-[11px] text-muted">{children}</kbd>
}

/** Search box used in page toolbars. */
export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-[var(--r-ctl)] border border-line bg-surface pr-3 pl-8 text-sm text-ink placeholder:text-faint hover:border-line-strong focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none"
      />
    </div>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
}

/** Compact select styled for filter toolbars. */
export function FilterSelect({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: ReactNode }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 appearance-none rounded-[var(--r-ctl)] border bg-surface pr-7 pl-3 text-[13px] font-medium hover:border-line-strong focus:border-primary focus:outline-none',
          value ? 'border-primary/40 text-primary' : 'border-line text-muted',
        )}
      >
        {children}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  )
}
