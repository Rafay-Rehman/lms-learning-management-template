import { useState } from 'react'
import { Shapes } from 'lucide-react'
import type { StudentGroup } from '@/types'
import { Avatar } from '@/components/ui/Badges'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { SearchInput } from '@/components/ui/misc'
import { useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { RecordsPage } from './academic/RecordsPage'

function StudentPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const students = data.users.filter((u) => u.role === 'student' && (!q || u.name.toLowerCase().includes(q.toLowerCase())))
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-[13px] font-medium">Students ({value.length})</legend>
      <SearchInput value={q} onChange={setQ} placeholder="Filter students" className="mt-1.5" />
      <div className="scroll-thin mt-2 grid max-h-56 gap-1.5 overflow-y-auto rounded-[var(--r-ctl)] border border-line p-2 sm:grid-cols-2">
        {students.map((u) => <Checkbox key={u.id} checked={value.includes(u.id)} onChange={(v) => onChange(v ? [...value, u.id] : value.filter((x) => x !== u.id))} label={<span className="flex items-center gap-2"><Avatar user={u} size="xs" />{u.name}</span>} />)}
      </div>
    </fieldset>
  )
}

/** Classrooms (taught groups tied to courses) and batches (intake cohorts) share one model. */
export function GroupsView({ kind }: { kind: StudentGroup['kind'] }) {
  const { data, actions } = useStore()
  const look = useLookup()
  const enrolledIn = (g: StudentGroup) => data.enrollments.filter((e) => g.studentIds.includes(e.userId) && (g.courseIds.length ? g.courseIds.includes(e.courseId) : true) && (e.status === 'active' || e.status === 'completed')).length
  return (
    <RecordsPage<StudentGroup>
      title={kind === 'classroom' ? 'Learning Groups' : 'Student Batches'}
      description={kind === 'classroom' ? 'Classrooms that study a set of courses together. Use them to filter enrollments and reports.' : 'Intake cohorts, such as an evening or weekend batch. Batches from past years are kept for reporting.'}
      noun={kind === 'classroom' ? 'group' : 'batch'}
      icon={<Shapes />}
      rows={data.groups.filter((g) => g.kind === kind)}
      blank={() => ({ id: `g-${crypto.randomUUID().slice(0, 8)}`, name: '', kind, description: '', yearId: data.academicYears.find((y) => y.status === 'active')?.id ?? null, studentIds: [], courseIds: [], createdAt: new Date().toISOString() })}
      save={actions.saveGroup}
      remove={(g) => actions.deleteRecord('groups', g.id)}
      csv={(rows) => [['Name', 'Academic year', 'Students', 'Courses'], ...rows.map((g) => [g.name, look.year(g.yearId)?.name, g.studentIds.map((i) => look.user(i)?.name).join('; '), g.courseIds.map((i) => look.course(i)?.title).join('; ')])]}
      columns={[
        { key: 'name', header: 'Name', sort: (g) => g.name, cell: (g) => <span><span className="block font-medium">{g.name}</span><span className="block max-w-80 truncate text-xs text-muted">{g.description}</span></span> },
        { key: 'year', header: 'Academic year', sort: (g) => look.year(g.yearId)?.name ?? '', cell: (g) => <span className="text-muted">{look.year(g.yearId)?.name ?? '—'}</span> },
        { key: 'students', header: 'Students', align: 'right', sort: (g) => g.studentIds.length, cell: (g) => g.studentIds.length },
        ...(kind === 'classroom' ? [{ key: 'courses', header: 'Courses', cell: (g: StudentGroup) => <span className="block max-w-64 truncate text-muted">{g.courseIds.map((i) => look.course(i)?.title).join(', ') || '—'}</span> }] : []),
        { key: 'enr', header: 'Enrollments', align: 'right', sort: enrolledIn, cell: enrolledIn },
      ]}
      form={(g, set, e) => (
        <>
          <Field label="Name" required error={e.name}>{(p) => <Input {...p} value={g.name} onChange={(ev) => set({ name: ev.target.value })} />}</Field>
          <Field label="Academic year">{(p) => <Select {...p} value={g.yearId ?? ''} onChange={(ev) => set({ yearId: ev.target.value || null })}><option value="">None</option>{data.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</Select>}</Field>
          <Field label="Description" className="sm:col-span-2">{(p) => <Textarea {...p} value={g.description} onChange={(ev) => set({ description: ev.target.value })} className="min-h-16" />}</Field>
          {kind === 'classroom' && (
            <fieldset className="sm:col-span-2">
              <legend className="text-[13px] font-medium">Courses</legend>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{data.courses.filter((c) => c.status !== 'archived').map((c) => <Checkbox key={c.id} checked={g.courseIds.includes(c.id)} onChange={(v) => set({ courseIds: v ? [...g.courseIds, c.id] : g.courseIds.filter((x) => x !== c.id) })} label={c.title} />)}</div>
            </fieldset>
          )}
          <StudentPicker value={g.studentIds} onChange={(ids) => set({ studentIds: ids })} />
        </>
      )}
    />
  )
}
