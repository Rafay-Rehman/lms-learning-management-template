import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Small dependency-free SVG charts. Each measures its container so text stays
// crisp at any width, shows a hover tooltip, and exposes a screen-reader
// table via `srTable`.

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function niceMax(v: number) {
  if (v <= 0) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

export interface Series {
  key: string
  name: string
  color: string
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 70), width - 70)
  return (
    <div className="glass pointer-events-none absolute z-10 min-w-32 -translate-x-1/2 -translate-y-full rounded-lg border border-line px-2.5 py-2 text-xs shadow-md" style={{ left, top: y - 8 }}>
      {children}
    </div>
  )
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="size-2 rounded-sm" style={{ background: color }} />
      <span className="flex-1 text-muted">{label}</span>
      <span className="font-medium text-ink tabular">{value}</span>
    </div>
  )
}

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted', className)}>
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.name}
        </li>
      ))}
    </ul>
  )
}

/** Stacked column chart. `rows[i][series.key]` holds the values. */
export function ColumnChart({
  rows,
  series,
  height = 220,
  format = (v) => String(v),
  label,
}: {
  rows: ({ label: string } & Record<string, number | string>)[]
  series: Series[]
  height?: number
  format?: (v: number) => string
  label: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 32, r: 4, t: 8, b: 22 }
  const total = (r: (typeof rows)[number]) => series.reduce((s, x) => s + (Number(r[x.key]) || 0), 0)
  const max = niceMax(Math.max(0, ...rows.map(total)))
  const innerW = Math.max(0, width - pad.l - pad.r)
  const innerH = height - pad.t - pad.b
  const step = rows.length ? innerW / rows.length : 0
  const barW = Math.max(2, Math.min(28, step * 0.62))
  const y = (v: number) => pad.t + innerH - (v / max) * innerH
  const every = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor(innerW / 56))))

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={width - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeDasharray={f ? '3 4' : undefined} />
              <text x={pad.l - 8} y={y(max * f)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular">
                {format(max * f)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = pad.l + step * i + step / 2
            let acc = 0
            const segs = series.map((s) => {
              const v = Number(r[s.key]) || 0
              const y0 = y(acc)
              acc += v
              return { s, v, y0, y1: y(acc) }
            }).filter((g) => g.v > 0)
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={cx - step / 2} y={pad.t} width={step} height={innerH} fill={hover === i ? 'var(--surface-3)' : 'transparent'} opacity={0.6} />
                {segs.map((g, k) => {
                  const top = k === segs.length - 1
                  const h = Math.max(0, g.y0 - g.y1 - (k > 0 ? 2 : 0))
                  return (
                    <path
                      key={g.s.key}
                      fill={g.s.color}
                      d={top ? roundedTop(cx - barW / 2, g.y1, barW, h, Math.min(4, barW / 2, h)) : `M${cx - barW / 2},${g.y1}h${barW}v${h}h${-barW}z`}
                    />
                  )
                })}
                {i % every === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="fill-faint text-[10px]">
                    {r.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && rows[hover] && (
        <Tooltip x={pad.l + step * hover + step / 2} y={y(total(rows[hover]))} width={width}>
          <div className="mb-1 font-medium text-ink">{rows[hover].label}</div>
          {series.map((s) => (
            <TooltipRow key={s.key} color={s.color} label={s.name} value={format(Number(rows[hover][s.key]) || 0)} />
          ))}
        </Tooltip>
      )}
      <SrTable label={label} head={['', ...series.map((s) => s.name)]} rows={rows.map((r) => [r.label, ...series.map((s) => format(Number(r[s.key]) || 0))])} />
    </div>
  )
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return ''
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/** Line chart with an area wash and a crosshair tooltip. */
export function LineChart({ rows, series, height = 220, format = (v) => String(v), label }: { rows: ({ label: string } & Record<string, number | string>)[]; series: Series[]; height?: number; format?: (v: number) => string; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 32, r: 8, t: 10, b: 22 }
  const max = niceMax(Math.max(0, ...rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0))))
  const innerW = Math.max(0, width - pad.l - pad.r)
  const innerH = height - pad.t - pad.b
  const x = (i: number) => pad.l + (rows.length > 1 ? (innerW * i) / (rows.length - 1) : innerW / 2)
  const y = (v: number) => pad.t + innerH - (v / max) * innerH
  const every = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor(innerW / 60))))

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect()
            const i = Math.round(((e.clientX - box.left - pad.l) / innerW) * (rows.length - 1))
            setHover(Math.max(0, Math.min(rows.length - 1, i)))
          }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.18" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={width - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeDasharray={f ? '3 4' : undefined} />
              <text x={pad.l - 8} y={y(max * f)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular">
                {format(max * f)}
              </text>
            </g>
          ))}
          {rows.map((r, i) =>
            i % every === 0 ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle'} className="fill-faint text-[10px]">
                {r.label}
              </text>
            ) : null,
          )}
          {series.map((s, si) => {
            const pts = rows.map((r, i) => [x(i), y(Number(r[s.key]) || 0)] as const)
            const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join('')
            return (
              <g key={s.key}>
                {si === 0 && pts.length > 1 && <path d={`${line}L${pts[pts.length - 1][0]},${y(0)}L${pts[0][0]},${y(0)}Z`} fill={`url(#grad-${s.key})`} />}
                <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            )
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} stroke="var(--line-strong)" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(Number(rows[hover][s.key]) || 0)} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && rows[hover] && (
        <Tooltip x={x(hover)} y={Math.min(...series.map((s) => y(Number(rows[hover][s.key]) || 0)))} width={width}>
          <div className="mb-1 font-medium text-ink">{rows[hover].label}</div>
          {series.map((s) => (
            <TooltipRow key={s.key} color={s.color} label={s.name} value={format(Number(rows[hover][s.key]) || 0)} />
          ))}
        </Tooltip>
      )}
      <SrTable label={label} head={['', ...series.map((s) => s.name)]} rows={rows.map((r) => [r.label, ...series.map((s) => format(Number(r[s.key]) || 0))])} />
    </div>
  )
}

/** Donut with a centre total and a direct-labelled legend. */
export function Donut({ items, label, centerLabel, size = 148 }: { items: { key: string; name: string; value: number; color: string }[]; label: string; centerLabel: string; size?: number }) {
  const [hover, setHover] = useState<string | null>(null)
  const total = items.reduce((s, i) => s + i.value, 0)
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const gap = items.filter((i) => i.value > 0).length > 1 ? 3 : 0
  let acc = 0
  const active = items.find((i) => i.key === hover)
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} role="img" aria-label={label} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
        {total > 0 &&
          items.map((i) => {
            const len = (i.value / total) * c
            const seg = (
              <circle
                key={i.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={i.color}
                strokeWidth={hover === i.key ? 18 : 14}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-acc}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                onMouseEnter={() => setHover(i.key)}
                onMouseLeave={() => setHover(null)}
                className="transition-[stroke-width] duration-150"
              />
            )
            acc += len
            return i.value > 0 ? seg : null
          })}
        <text x="50%" y="46%" textAnchor="middle" className="fill-ink font-display text-2xl font-semibold tabular">
          {active ? active.value : total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-faint text-[11px]">
          {active ? active.name : centerLabel}
        </text>
      </svg>
      <ul className="min-w-36 flex-1 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2.5" onMouseEnter={() => setHover(i.key)} onMouseLeave={() => setHover(null)}>
            <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
            <span className="flex-1 text-muted">{i.name}</span>
            <span className="font-medium text-ink tabular">{i.value}</span>
            <span className="w-10 text-right text-xs text-faint tabular">{total ? Math.round((i.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Horizontal bars with direct labels — for ranked comparisons. */
export function BarList({ items, format = (v) => String(v), max: maxProp }: { items: { key: string; label: ReactNode; value: number; color?: string; hint?: string }[]; format?: (v: number) => string; max?: number }) {
  const max = maxProp ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.key} title={i.hint}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{i.label}</span>
            <span className="text-muted tabular">{format(i.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (i.value / max) * 100)}%`, background: i.color ?? 'var(--primary)' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function SrTable({ label, head, rows }: { label: string; head: string[]; rows: string[][] }) {
  return (
    <div className="sr-only top-0 left-0">
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
