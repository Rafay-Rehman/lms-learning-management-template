import { useState } from 'react'
import type { Period } from '@/services/analytics'
import { addDays, startOfMonth, daysInMonth, today } from '@/lib/date'
import { Input } from './Field'
import { FilterSelect } from './misc'

export type PresetKey = '7d' | '30d' | '90d' | '180d' | 'month' | 'custom'

export function presetPeriod(key: Exclude<PresetKey, 'custom'>): Period {
  const t = today()
  if (key === 'month') return { from: startOfMonth(t), to: addDays(startOfMonth(t), daysInMonth(t) - 1) }
  const n = { '7d': 7, '30d': 30, '90d': 90, '180d': 180 }[key]
  return { from: addDays(t, -(n - 1)), to: t }
}

/** Period state with presets. Custom ranges are clamped so `to` is never before `from`. */
export function usePeriod(initial: Exclude<PresetKey, 'custom'> = '30d') {
  const [preset, setPreset] = useState<PresetKey>(initial)
  const [custom, setCustom] = useState<Period>(presetPeriod(initial))
  const period = preset === 'custom' ? custom : presetPeriod(preset)
  return { preset, setPreset, period, custom, setCustom }
}

const labels: Record<PresetKey, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', month: 'This month', '180d': 'Last 6 months', custom: 'Custom range' }

export function PeriodPicker({ state }: { state: ReturnType<typeof usePeriod> }) {
  const { preset, setPreset, custom, setCustom, period } = state
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect label="Date range" value={preset} onChange={(v) => {
        if (v === 'custom') setCustom(period)
        setPreset(v as PresetKey)
      }}>
        {(Object.keys(labels) as PresetKey[]).map((k) => <option key={k} value={k}>{labels[k]}</option>)}
      </FilterSelect>
      {preset === 'custom' && (
        <>
          <Input type="date" aria-label="From" className="w-40" value={custom.from} onChange={(e) => e.target.value && setCustom({ from: e.target.value, to: custom.to < e.target.value ? e.target.value : custom.to })} />
          <Input type="date" aria-label="To" className="w-40" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value < custom.from ? custom.from : e.target.value })} />
        </>
      )}
    </div>
  )
}
