import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ClipboardList, Download, PenSquare, Plus, Trash2 } from 'lucide-react'
import type { Assignment } from '@/types'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { addDays, formatDate, relativeDay, today } from '@/lib/date'
import { uid } from '@/state/actions'
import { report, useLookup, useStaffBase, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

const statusMeta = { draft: { label: 'Draft', color: 'var(--faint)' }, assigned: { label: 'Assigned', color: 'var(--primary)' }, closed: { label: 'Closed', color: 'var(--muted)' } }

export function AssignmentForm({ value, onClose }: { value: Assignment | null; onClose: () => void }) {
  const { actions } = useStore()
  const toast = useToast()
  const courses = useTeachingCourses().filter((c) => c.status !== 'archived')
  const [a, setA] = useState<Assignment | null>(value)
  const [errors, setErrors] = useState<Record<string, string>>({})
  if (value && a?.id !== value.id) (setA(value), setErrors({}))
  const set = (p: Partial<Assignment>) => setA((x) => ({ ...x!, ...p }))
  const save = () => {
    const r = actions.saveAssignment(a!)
    if (!r.ok) return setErrors(r.errors)
    toast(a!.status === 'assigned' ? 'Assignment saved and visible to students' : 'Assignment saved as a draft')
    onClose()
  }
  return (
    <Dialog open={!!value} onClose={onClose} title={value?.title ? 'Edit assignment' : 'New assignment'} size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save assignment</Button></>}>
      {a && (
        <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save())}>
          {errors.form && <p className="text-sm text-danger sm:col-span-2" role="alert">{errors.form}</p>}
          <Field label="Title" required error={errors.title} className="sm:col-span-2">{(p) => <Input {...p} value={a.title} onChange={(e) => set({ title: e.target.value })} autoFocus />}</Field>
          <Field label="Course" required error={errors.courseId}>{(p) => <Select {...p} value={a.courseId} onChange={(e) => set({ courseId: e.target.value })}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>}</Field>
          <Field label="Status" hint="Students only see assigned work.">{(p) => <Select {...p} value={a.status} onChange={(e) => set({ status: e.target.value as Assignment['status'] })}><option value="draft">Draft</option><option value="assigned">Assigned</option><option value="closed">Closed (no more submissions)</option></Select>}</Field>
          <Field label="Due date" required error={errors.dueDate}>{(p) => <Input {...p} type="date" value={a.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />}</Field>
          <Field label="Maximum points" required error={errors.maxPoints}>{(p) => <Input {...p} type="number" min={1} max={1000} value={a.maxPoints} onChange={(e) => set({ maxPoints: Number(e.target.value) })} />}</Field>
          <Field label="Instructions" required error={errors.instructions} hint="Supports ## headings, - bullets and **bold**." className="sm:col-span-2">{(p) => <Textarea {...p} value={a.instructions} onChange={(e) => set({ instructions: e.target.value })} className="min-h-36" />}</Field>
          <Checkbox className="sm:col-span-2" label="Accept late submissions (marked as late)" checked={a.allowLate} onChange={(v) => set({ allowLate: v })} />
        </form>
      )}
    </Dialog>
  )
}

export default function AssignmentsPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const navigate = useNavigate()
  const base = useStaffBase()
  const [confirm, dialog] = useConfirm()
  const courses = useTeachingCourses()
  const ids = new Set(courses.map((c) => c.id))
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [q, setQ] = useState('')
  const [course, setCourse] = useState('')
  const [status, setStatus] = useState('')
  const rows = data.assignments
    .filter((a) => ids.has(a.courseId) && (!course || a.courseId === course) && (!status || a.status === status) && (!q || a.title.toLowerCase().includes(q.toLowerCase())))
    .map((a) => {
      const subs = data.submissions.filter((s) => s.assignmentId === a.id)
      const students = data.enrollments.filter((e) => e.courseId === a.courseId && (e.status === 'active' || e.status === 'completed')).length
      return { ...a, subs: subs.length, toGrade: subs.filter((s) => s.status === 'submitted' || s.status === 'late').length, students }
    })
  const blank = (): Assignment => ({ id: uid('as'), courseId: course || courses[0]?.id || '', title: '', instructions: '', dueDate: addDays(today(), 14), maxPoints: 20, allowLate: true, status: 'draft', createdAt: new Date().toISOString() })
  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Written and project work. Open an assignment to review and grade submissions."
        actions={
          <>
            <Button icon={<Download />} onClick={() => downloadCsv('assignments.csv', [['Title', 'Course', 'Status', 'Due', 'Max points', 'Submissions', 'To grade'], ...rows.map((a) => [a.title, look.course(a.courseId)?.title, a.status, a.dueDate, a.maxPoints, a.subs, a.toGrade])])}>Export CSV</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing(blank())} disabled={!courses.length}>New assignment</Button>
          </>
        }
      />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search assignments" className="w-full sm:w-60" />
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        <FilterSelect label="Status" value={status} onChange={setStatus}><option value="">All statuses</option><option value="draft">Draft</option><option value="assigned">Assigned</option><option value="closed">Closed</option></FilterSelect>
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Assignments"
          rows={rows}
          initialSort={{ key: 'due', dir: 'asc' }}
          onRowClick={(a) => navigate(`${base}/assignments/${a.id}`)}
          empty={<EmptyState icon={<ClipboardList />} title="No assignments" body="Create one to collect written work from students." />}
          columns={[
            { key: 'title', header: 'Assignment', sort: (a) => a.title, cell: (a) => <span className="font-medium">{a.title}</span> },
            { key: 'course', header: 'Course', sort: (a) => look.course(a.courseId)?.title ?? '', cell: (a) => <span className="block max-w-52 truncate text-muted">{look.course(a.courseId)?.title}</span> },
            { key: 'due', header: 'Due', sort: (a) => a.dueDate, cell: (a) => <span className={a.dueDate < today() && a.status === 'assigned' ? 'text-danger' : 'text-muted'}>{formatDate(a.dueDate)} · {relativeDay(a.dueDate)}</span> },
            { key: 'subs', header: 'Submitted', align: 'right', sort: (a) => a.subs, cell: (a) => `${a.subs} / ${a.students}` },
            { key: 'grade', header: 'To grade', align: 'right', sort: (a) => a.toGrade, cell: (a) => (a.toGrade ? <Badge color="var(--warning)">{a.toGrade}</Badge> : <span className="text-faint">0</span>) },
            { key: 'status', header: 'Status', sort: (a) => a.status, cell: (a) => <Badge color={statusMeta[a.status].color}>{statusMeta[a.status].label}</Badge> },
            { key: 'actions', header: <span className="sr-only">Actions</span>, cell: (a) => <RowMenu label={`Actions for ${a.title}`} items={[{ label: 'Edit details', icon: <PenSquare />, onSelect: () => setEditing(a) }, { label: 'Delete…', icon: <Trash2 />, danger: true, onSelect: () => confirm({ title: `Delete ${a.title}?`, body: a.subs ? 'Students have submitted work, so this can’t be deleted. Close it instead to keep their grades.' : 'This assignment is removed permanently.', confirmLabel: 'Delete', onConfirm: () => report(toast, actions.deleteAssignment(a.id), 'Assignment deleted') }) }]} /> },
          ]}
        />
      </div>
      <AssignmentForm value={editing} onClose={() => setEditing(null)} />
      {dialog}
    </div>
  )
}
