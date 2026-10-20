import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  tone: Tone
  action?: { label: string; onClick: () => void }
}

const ToastContext = createContext<(message: string, opts?: { tone?: Tone; action?: Toast['action'] }) => void>(() => {})

let next = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  const push = useCallback((message: string, opts: { tone?: Tone; action?: Toast['action'] } = {}) => {
    const id = ++next
    setToasts((t) => [...t.slice(-3), { id, message, tone: opts.tone ?? 'success', action: opts.action }])
    setTimeout(() => dismiss(id), 4200)
  }, [])

  const icons = { success: <CheckCircle2 className="text-success" />, error: <XCircle className="text-danger" />, info: <Info className="text-primary" /> }
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={cn('glass pointer-events-auto flex animate-pop items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-sm shadow-lg [&_svg]:size-4 [&_svg]:shrink-0')}>
            {icons[t.tone]}
            <span className="flex-1 text-ink">{t.message}</span>
            {t.action && (
              <button className="font-medium text-primary hover:underline" onClick={() => { t.action!.onClick(); dismiss(t.id) }}>
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" className="text-faint hover:text-ink" onClick={() => dismiss(t.id)}>
              <X />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
