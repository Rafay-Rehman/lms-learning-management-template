import { FolderTree } from 'lucide-react'
import type { SubjectCategory } from '@/types'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useStore } from '@/state/store'
import { RecordsPage } from './RecordsPage'
import { uidOf } from './shared'

export default function SubjectCategoriesPage() {
  const { data, actions } = useStore()
  const n = (c: SubjectCategory) => data.subjects.filter((s) => s.categoryId === c.id).length
  return (
    <RecordsPage<SubjectCategory>
      title="Subject Categories"
      description="Broad groupings for subjects, used for filtering and reporting."
      noun="subject category"
      icon={<FolderTree />}
      rows={data.subjectCategories}
      blank={() => ({ id: uidOf('scat'), name: '', description: '' })}
      save={actions.saveSubjectCategory}
      remove={(c) => actions.deleteRecord('subjectCategories', c.id)}
      csv={(rows) => [['Category', 'Description', 'Subjects'], ...rows.map((c) => [c.name, c.description, n(c)])]}
      columns={[
        { key: 'name', header: 'Category', sort: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
        { key: 'desc', header: 'Description', cell: (c) => <span className="block max-w-[28rem] truncate text-muted">{c.description}</span> },
        { key: 'n', header: 'Subjects', align: 'right', sort: n, cell: n },
      ]}
      form={(c, set, e) => (
        <>
          <Field label="Name" required error={e.name} className="sm:col-span-2">{(p) => <Input {...p} value={c.name} onChange={(ev) => set({ name: ev.target.value })} />}</Field>
          <Field label="Description" className="sm:col-span-2">{(p) => <Textarea {...p} value={c.description} onChange={(ev) => set({ description: ev.target.value })} />}</Field>
        </>
      )}
    />
  )
}
