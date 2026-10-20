import { useState } from 'react'
import { Archive, CalendarDays, CheckCircle2 } from 'lucide-react'
import type { PeriodStatus, Term } from '@/types'
import { StatusBadge } from '@/components/ui/Badges'
import { Field, Input, Select } from '@/components/ui/Field'
import { FilterSelect } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/date'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { RecordsPage } from './RecordsPage'
import { periodMeta, uidOf } from './shared'

export default function TermsPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const [year, setYear] = useState('')
  const fmt = (d: string) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
  const active = data.academicYears.find((y) => y.status === 'active') ?? data.academicYears[0]
  return (
    <RecordsPage<Term>
      title="Terms / Semesters"
      description="Teaching periods inside an academic year. Courses and subjects can be scheduled in a term, or left self-paced."
      noun="term"
      icon={<CalendarDays />}
      rows={[...data.terms].sort((a, b) => b.start.localeCompare(a.start))}
      filter={(t) => !year || t.yearId === year}
      toolbar={<FilterSelect label="Academic year" value={year} onChange={setYear}><option value="">All years</option>{data.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</FilterSelect>}
      blank={() => ({ id: uidOf('t'), yearId: active?.id ?? '', name: '', start: active?.start ?? '', end: active?.end ?? '', status: 'upcoming' })}
      save={actions.saveTerm}
      remove={(t) => actions.deleteRecord('terms', t.id)}
      extraActions={(t) => [
        ...(t.status !== 'active' ? [{ label: 'Mark active', icon: <CheckCircle2 />, onSelect: () => report(toast, actions.setPeriodStatus('terms', t.id, 'active'), `${t.name} is active`) }] : []),
        ...(t.status !== 'archived' ? [{ label: 'Archive', icon: <Archive />, onSelect: () => report(toast, actions.setPeriodStatus('terms', t.id, 'archived'), `${t.name} archived`) }] : []),
      ]}
      csv={(rows) => [['Term', 'Academic year', 'Start', 'End', 'Status', 'Courses'], ...rows.map((t) => [t.name, look.year(t.yearId)?.name, t.start, t.end, t.status, data.courses.filter((c) => c.termId === t.id).length])]}
      columns={[
        { key: 'name', header: 'Term', sort: (t) => t.start, cell: (t) => <span className="font-medium">{t.name}</span> },
        { key: 'year', header: 'Academic year', sort: (t) => look.year(t.yearId)?.name ?? '', cell: (t) => <span className="text-muted">{look.year(t.yearId)?.name}</span> },
        { key: 'dates', header: 'Dates', cell: (t) => <span className="text-muted">{fmt(t.start)} – {fmt(t.end)}</span> },
        { key: 'courses', header: 'Courses', align: 'right', sort: (t) => data.courses.filter((c) => c.termId === t.id).length, cell: (t) => data.courses.filter((c) => c.termId === t.id).length },
        { key: 'status', header: 'Status', sort: (t) => t.status, cell: (t) => <StatusBadge meta={periodMeta[t.status]} /> },
      ]}
      form={(t, set, e) => (
        <>
          <Field label="Name" required error={e.name}>{(p) => <Input {...p} value={t.name} onChange={(ev) => set({ name: ev.target.value })} placeholder="e.g. Spring 2027" />}</Field>
          <Field label="Academic year" required error={e.yearId}>{(p) => <Select {...p} value={t.yearId} onChange={(ev) => set({ yearId: ev.target.value })}>{data.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</Select>}</Field>
          <Field label="Starts" required error={e.start}>{(p) => <Input {...p} type="date" value={t.start} onChange={(ev) => set({ start: ev.target.value })} />}</Field>
          <Field label="Ends" required error={e.end}>{(p) => <Input {...p} type="date" value={t.end} onChange={(ev) => set({ end: ev.target.value })} />}</Field>
          <Field label="Status">{(p) => <Select {...p} value={t.status} onChange={(ev) => set({ status: ev.target.value as PeriodStatus })}><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="archived">Archived</option></Select>}</Field>
        </>
      )}
    />
  )
}
