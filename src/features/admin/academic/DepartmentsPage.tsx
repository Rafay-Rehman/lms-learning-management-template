import { useState } from 'react'
import { Building2 } from 'lucide-react'
import type { Department } from '@/types'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FilterSelect } from '@/components/ui/misc'
import { useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { RecordsPage } from './RecordsPage'
import { uidOf } from './shared'

export default function DepartmentsPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  const [faculty, setFaculty] = useState('')
  const subjects = (d: Department) => data.subjects.filter((s) => s.departmentId === d.id)
  return (
    <RecordsPage<Department>
      title="Departments"
      description="Departments own subjects and employ instructors. Faculties are optional — turn them off in Platform Settings if you don’t use them."
      noun="department"
      icon={<Building2 />}
      rows={data.departments}
      filter={(d) => !faculty || d.facultyId === faculty}
      toolbar={data.settings.academic.faculties && <FilterSelect label="Faculty" value={faculty} onChange={setFaculty}><option value="">All faculties</option>{data.faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</FilterSelect>}
      blank={() => ({ id: uidOf('dep'), name: '', code: '', facultyId: null, description: '', headId: null })}
      save={actions.saveDepartment}
      remove={(d) => actions.deleteRecord('departments', d.id)}
      csv={(rows) => [['Code', 'Department', 'Faculty', 'Head', 'Subjects', 'Courses'], ...rows.map((d) => [d.code, d.name, look.department(d.id) && data.faculties.find((f) => f.id === d.facultyId)?.name, look.user(d.headId)?.name, subjects(d).length, data.courses.filter((c) => subjects(d).some((s) => s.id === c.subjectId)).length])]}
      columns={[
        { key: 'name', header: 'Department', sort: (d) => d.name, cell: (d) => <span><span className="block font-medium">{d.name}</span><span className="block text-xs text-muted">{d.code}</span></span> },
        ...(data.settings.academic.faculties ? [{ key: 'faculty', header: 'Faculty', sort: (d: Department) => data.faculties.find((f) => f.id === d.facultyId)?.name ?? '', cell: (d: Department) => <span className="text-muted">{data.faculties.find((f) => f.id === d.facultyId)?.name ?? '—'}</span> }] : []),
        { key: 'head', header: 'Head', sort: (d) => look.user(d.headId)?.name ?? '', cell: (d) => <span className="text-muted">{look.user(d.headId)?.name ?? '—'}</span> },
        { key: 'subjects', header: 'Subjects', align: 'right', sort: (d) => subjects(d).length, cell: (d) => subjects(d).length },
        { key: 'staff', header: 'Instructors', align: 'right', sort: (d) => data.users.filter((u) => u.departmentId === d.id).length, cell: (d) => data.users.filter((u) => u.departmentId === d.id).length },
      ]}
      form={(d, set, e) => (
        <>
          <Field label="Name" required error={e.name}>{(p) => <Input {...p} value={d.name} onChange={(ev) => set({ name: ev.target.value })} />}</Field>
          <Field label="Code" required error={e.code} hint="2–6 letters">{(p) => <Input {...p} value={d.code} onChange={(ev) => set({ code: ev.target.value.toUpperCase() })} maxLength={6} />}</Field>
          {data.settings.academic.faculties && <Field label="Faculty">{(p) => <Select {...p} value={d.facultyId ?? ''} onChange={(ev) => set({ facultyId: ev.target.value || null })}><option value="">None</option>{data.faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select>}</Field>}
          <Field label="Head of department">{(p) => <Select {...p} value={d.headId ?? ''} onChange={(ev) => set({ headId: ev.target.value || null })}><option value="">None</option>{data.users.filter((u) => u.role === 'instructor').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}</Field>
          <Field label="Description" className="sm:col-span-2">{(p) => <Textarea {...p} value={d.description} onChange={(ev) => set({ description: ev.target.value })} />}</Field>
        </>
      )}
    />
  )
}
