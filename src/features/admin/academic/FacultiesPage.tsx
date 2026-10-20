import { Landmark } from 'lucide-react'
import type { Faculty } from '@/types'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { RecordsPage } from './RecordsPage'
import { uidOf } from './shared'

export default function FacultiesPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  return (
    <RecordsPage<Faculty>
      title="Faculties"
      description="The largest academic units. Departments belong to a faculty."
      noun="faculty"
      icon={<Landmark />}
      rows={data.faculties}
      blank={() => ({ id: uidOf('fac'), name: '', description: '', deanId: null })}
      save={actions.saveFaculty}
      remove={(f) => actions.deleteRecord('faculties', f.id)}
      csv={(rows) => [['Faculty', 'Dean', 'Departments'], ...rows.map((f) => [f.name, look.user(f.deanId)?.name, data.departments.filter((d) => d.facultyId === f.id).length])]}
      columns={[
        { key: 'name', header: 'Faculty', sort: (f) => f.name, cell: (f) => <span><span className="block font-medium">{f.name}</span><span className="block max-w-96 truncate text-xs text-muted">{f.description}</span></span> },
        { key: 'dean', header: 'Dean', sort: (f) => look.user(f.deanId)?.name ?? '', cell: (f) => <span className="text-muted">{look.user(f.deanId)?.name ?? '—'}</span> },
        { key: 'deps', header: 'Departments', align: 'right', sort: (f) => data.departments.filter((d) => d.facultyId === f.id).length, cell: (f) => data.departments.filter((d) => d.facultyId === f.id).length },
      ]}
      form={(f, set, e) => (
        <>
          <Field label="Name" required error={e.name} className="sm:col-span-2">{(p) => <Input {...p} value={f.name} onChange={(ev) => set({ name: ev.target.value })} />}</Field>
          <Field label="Dean">{(p) => <Select {...p} value={f.deanId ?? ''} onChange={(ev) => set({ deanId: ev.target.value || null })}><option value="">None</option>{data.users.filter((u) => u.role !== 'student').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}</Field>
          <Field label="Description" className="sm:col-span-2">{(p) => <Textarea {...p} value={f.description} onChange={(ev) => set({ description: ev.target.value })} />}</Field>
        </>
      )}
    />
  )
}
