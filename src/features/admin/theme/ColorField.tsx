import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { load, save } from '@/services/persistence'
import { hexToRgb, hslToHex, normalizeHex, rgbToHsl } from '@/services/theme'

const isList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** Recently picked colors, kept per browser. */
export function useRecentColors() {
  const [recent, setRecent] = useState<string[]>(() => load('recent-colors', isList) ?? [])
  const push = (hex: string) =>
    setRecent((r) => {
      const next = [hex, ...r.filter((x) => x !== hex)].slice(0, 10)
      save('recent-colors', next)
      return next
    })
  return { recent, push }
}

/**
 * Color input: native picker, hex text and HSL numbers. Invalid hex is shown
 * as an error and never applied, so the theme always holds valid colors.
 */
export function ColorField({ label, value, onChange, onReset, recent }: { label: string; value: string; onChange: (hex: string) => void; onReset?: () => void; recent: string[] }) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  useEffect(() => setText(value), [value])
  const valid = normalizeHex(text)
  const [h, s, l] = rgbToHsl(...hexToRgb(value))
  const id = label.toLowerCase().replace(/\W+/g, '-')
  return (
    <div className="rounded-[var(--r-ctl)] border border-line p-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-hex`} className="flex-1 text-[13px] font-medium">{label}</label>
        {onReset && <button type="button" onClick={onReset} className="text-faint hover:text-ink" aria-label={`Reset ${label} to the preset value`} title="Reset to preset"><RotateCcw className="size-3.5" /></button>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input type="color" aria-label={`${label} color picker`} value={value} onChange={(e) => onChange(e.target.value)} className="size-9 shrink-0 cursor-pointer rounded-[var(--r-ctl)] border border-line bg-transparent p-0.5" />
        <Input
          id={`${id}-hex`}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            const hex = normalizeHex(e.target.value)
            if (hex) onChange(hex)
          }}
          onBlur={() => setText(value)}
          aria-invalid={!valid || undefined}
          className="font-mono text-[13px] uppercase"
          maxLength={7}
          spellCheck={false}
        />
        <button type="button" className="shrink-0 text-xs font-medium text-link hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>HSL</button>
      </div>
      {!valid && <p className="mt-1 text-xs text-danger" role="alert">Use a hex color like #3D41D6</p>}
      {open && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([['H', h, 360, (v: number) => hslToHex(v, s, l)], ['S', s, 100, (v: number) => hslToHex(h, v, l)], ['L', l, 100, (v: number) => hslToHex(h, s, v)]] as const).map(([k, v, max, to]) => (
            <label key={k} className="text-[11px] text-muted">
              {k}
              <Input type="number" min={0} max={max} value={v} onChange={(e) => onChange(to(Math.max(0, Math.min(max, Number(e.target.value) || 0))))} className="h-8 text-xs" />
            </label>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1" aria-label="Recent colors">
          {recent.slice(0, 8).map((c) => (
            <button key={c} type="button" onClick={() => onChange(c)} title={c} aria-label={`Use ${c}`} className={cn('size-5 rounded-full border border-line', c === value && 'ring-2 ring-primary ring-offset-1 ring-offset-surface')} style={{ background: c }} />
          ))}
        </div>
      )}
    </div>
  )
}
