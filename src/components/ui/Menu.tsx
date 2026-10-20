import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface MenuItem {
  label: ReactNode
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  checked?: boolean
  disabled?: boolean
}

/**
 * Accessible dropdown menu. `trigger` receives props to spread on a button.
 * Arrow keys move focus, Escape closes and returns focus to the trigger.
 */
export function Menu({
  trigger,
  items,
  align = 'end',
  header,
  className,
  width = 'w-56',
  multi,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode
  items?: (MenuItem | 'divider')[]
  align?: 'start' | 'end'
  header?: ReactNode
  className?: string
  width?: string
  /** Keep the menu open after selecting (checkbox lists). */
  multi?: boolean
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    root.current?.querySelector<HTMLElement>('[role^=menuitem]:not([disabled])')?.focus()
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault() // keep an enclosing <dialog> open
      e.stopPropagation()
      setOpen(false)
      root.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const els = [...(root.current?.querySelectorAll<HTMLElement>('[role^=menuitem]:not([disabled])') ?? [])]
      const i = els.indexOf(document.activeElement as HTMLElement)
      els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus()
    }
  }

  return (
    <div ref={root} className={cn('relative', className)} onKeyDown={onKeyDown}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && (
        <div
          role="menu"
          className={cn(
            'glass absolute top-full z-40 mt-1.5 animate-pop overflow-hidden rounded-xl border border-line p-1 shadow-lg',
            width,
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {header}
          {items?.map((item, i) =>
            item === 'divider' ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={i}
                type="button"
                role={item.checked === undefined ? 'menuitem' : multi ? 'menuitemcheckbox' : 'menuitemradio'}
                aria-checked={item.checked}
                disabled={item.disabled}
                onClick={() => {
                  if (!multi) setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none focus:bg-surface-3 disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
                  item.danger ? 'text-danger' : 'text-ink',
                )}
              >
                {item.icon && <span className={item.danger ? '' : 'text-muted'}>{item.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.checked && <Check className="text-primary" />}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/** Free-form floating panel (notifications, filters). Closes on outside click and Escape. */
export function Popover({
  trigger,
  children,
  align = 'end',
  width = 'w-80',
  label,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  width?: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={root} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open })}
      {open && (
        <div role="dialog" aria-label={label} className={cn('glass absolute top-full z-40 mt-1.5 max-w-[calc(100vw-1.5rem)] animate-pop overflow-hidden rounded-xl border border-line shadow-lg', width, align === 'end' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
