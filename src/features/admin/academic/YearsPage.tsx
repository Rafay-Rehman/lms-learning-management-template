import { Archive, CalendarRange, CheckCircle2 } from 'lucide-react'
import type { AcademicYear, PeriodStatus } from '@/types'
import { StatusBadge } from '@/components/ui/Badges'
import { Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/date'
import { report } from '@/state/selectors'
import { useStore } from '@/state/store'
import { RecordsPage } from './RecordsPage'
import { periodMeta, uidOf } from './shared'

export default function YearsPage() {
  const { data, actions } = useStore()
  const toast = useToast()
  const fmt = (d: string) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <RecordsPage<AcademicYear>
      title="Academic Years"
      description="The top of the academic calendar. Archiving a year also archives its terms but keeps every course, enrollment and grade."
      noun="academic year"
      icon={<CalendarRange />}
      rows={[...data.academicYears].sort((a, b) => b.start.localeCompare(a.start))}
      blank={() => { const y = new Date().getFullYear() + 1; return { id: uidOf('ay'), name: `${y}–${String(y + 1).slice(2)}`, start: `${y}-09-01`, end: `${y + 1}-08-31`, status: 'upcoming' } }}
      save={actions.saveYear}
      remove={(y) => actions.deleteRecord('academicYears', y.id)}
      extraActions={(y) => [
        ...(y.status !== 'active' ? [{ label: 'Mark active', icon: <CheckCircle2 />, onSelect: () => report(toast, actions.setPeriodStatus('academicYears', y.id, 'active'), `${y.name} is active`) }] : []),
        ...(y.status !== 'archived' ? [{ label: 'Archive', icon: <Archive />, onSelect: () => report(toast, actions.setPeriodStatus('academicYears', y.id, 'archived'), `${y.name} archived with its terms`) }] : []),
      ]}
      csv={(rows) => [['Name', 'Start', 'End', 'Status', 'Terms'], ...rows.map((y) => [y.name, y.start, y.end, y.status, data.terms.filter((t) => t.yearId === y.id).length])]}
      columns={[
        { key: 'name', header: 'Academic year', sort: (y) => y.start, cell: (y) => <span className="font-medium">{y.name}</span> },
        { key: 'dates', header: 'Dates', cell: (y) => <span className="text-muted">{fmt(y.start)} – {fmt(y.end)}</span> },
        { key: 'terms', header: 'Terms', align: 'right', sort: (y) => data.terms.filter((t) => t.yearId === y.id).length, cell: (y) => data.terms.filter((t) => t.yearId === y.id).length },
        { key: 'subjects', header: 'Subjects', align: 'right', sort: (y) => data.subjects.filter((s) => s.yearId === y.id).length, cell: (y) => data.subjects.filter((s) => s.yearId === y.id).length },
        { key: 'status', header: 'Status', sort: (y) => y.status, cell: (y) => <StatusBadge meta={periodMeta[y.status]} /> },
      ]}
      form={(y, set, e) => (
        <>
          <Field label="Name" required error={e.name} className="sm:col-span-2">{(p) => <Input {...p} value={y.name} onChange={(ev) => set({ name: ev.target.value })} />}</Field>
          <Field label="Starts" required error={e.start}>{(p) => <Input {...p} type="date" value={y.start} onChange={(ev) => set({ start: ev.target.value })} />}</Field>
          <Field label="Ends" required error={e.end}>{(p) => <Input {...p} type="date" value={y.end} onChange={(ev) => set({ end: ev.target.value })} />}</Field>
          <Field label="Status">{(p) => <Select {...p} value={y.status} onChange={(ev) => set({ status: ev.target.value as PeriodStatus })}><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="archived">Archived</option></Select>}</Field>
        </>
      )}
    />
  )
}
