import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

// Modal and drawer use the native <dialog> element: focus trapping, Escape to
// close and top-layer stacking come from the browser.

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  variant?: 'modal' | 'drawer'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Hide the visible header (title is still used as the accessible name). */
  bare?: boolean
}

export function Dialog({ open, onClose, title, description, children, footer, variant = 'modal', size = 'md', bare }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      if (variant === 'drawer') panelRef.current?.focus()
    }
    if (!open && el.open) el.close()
  }, [open, variant])

  useEffect(() => {
    const el = ref.current
    const handler = () => closeRef.current()
    el?.addEventListener('close', handler)
    return () => el?.removeEventListener('close', handler)
  }, [])

  const drawer = variant === 'drawer'
  return (
    <dialog
      ref={ref}
      aria-label={typeof title === 'string' ? title : undefined}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'm-0 max-h-none max-w-none overflow-visible bg-transparent p-0 text-ink backdrop:bg-[rgb(14_28_22/0.45)] backdrop:backdrop-blur-[2px] open:flex',
        drawer ? 'ml-auto h-dvh w-full sm:w-[min(640px,92vw)]' : 'inset-0 h-dvh w-full items-start justify-center px-4 pt-[8vh] pb-6',
      )}
    >
      {open && (
        <div
          // Drawers focus their panel, not the first link inside, when opened.
          ref={panelRef}
          tabIndex={drawer ? -1 : undefined}
          className={cn(
            'flex w-full flex-col overflow-hidden border border-line bg-surface shadow-lg outline-none',
            drawer ? 'h-full animate-slide sm:rounded-l-2xl' : 'max-h-[86vh] animate-pop rounded-2xl',
            !drawer && { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size],
          )}
        >
          {!bare && (
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close" icon={<X />} />
            </header>
          )}
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmOptions {
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  /** `primary` for important but non-destructive changes (check-in, issue invoice). */
  tone?: 'danger' | 'primary'
}

/** `const [confirm, dialog] = useConfirm()` — render `dialog`, call `confirm({...})`. */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const dialog = (
    <Dialog
      open={!!opts}
      onClose={() => setOpts(null)}
      title={opts?.title ?? ''}
      size="sm"
      footer={
        <>
          <Button onClick={() => setOpts(null)}>Cancel</Button>
          <Button
            variant={opts?.tone === 'primary' ? 'primary' : 'danger'}
            onClick={() => {
              opts?.onConfirm()
              setOpts(null)
            }}
          >
            {opts?.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 px-5 py-4 text-sm text-muted">
        <AlertTriangle className={cn('mt-0.5 size-5 shrink-0', opts?.tone === 'primary' ? 'text-primary' : 'text-danger')} />
        <div>{opts?.body}</div>
      </div>
    </Dialog>
  )
  return [setOpts, dialog] as const
}
