import { Tags } from 'lucide-react'
import type { Category } from '@/types'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { SUBJECT_ICONS, iconFor } from '@/components/ui/icons'
import { useStore } from '@/state/store'
import { RecordsPage } from './RecordsPage'
import { uidOf } from './shared'

export default function CategoriesPage() {
  const { data, actions } = useStore()
  const n = (c: Category) => data.courses.filter((x) => x.categoryId === c.id).length
  const pub = (c: Category) => data.courses.filter((x) => x.categoryId === c.id && x.status === 'published').length
  return (
    <RecordsPage<Category>
      title="Course Categories"
      description="How visitors browse the catalog. A category that still has courses can’t be deleted — move the courses first."
      noun="category"
      icon={<Tags />}
      rows={data.categories}
      blank={() => ({ id: uidOf('cat'), name: '', description: '', hue: 220, icon: 'book' })}
      save={actions.saveCategory}
      remove={(c) => actions.deleteRecord('categories', c.id)}
      csv={(rows) => [['Category', 'Description', 'Courses', 'Published'], ...rows.map((c) => [c.name, c.description, n(c), pub(c)])]}
      columns={[
        { key: 'name', header: 'Category', sort: (c) => c.name, cell: (c) => { const I = iconFor(c.icon); return <span className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-[var(--r-ctl)]" style={{ background: `hsl(${c.hue} 50% 50% / .15)`, color: `hsl(${c.hue} 55% 42%)` }}><I className="size-4" /></span><span className="font-medium">{c.name}</span></span> } },
        { key: 'desc', header: 'Description', cell: (c) => <span className="block max-w-[26rem] truncate text-muted">{c.description}</span> },
        { key: 'n', header: 'Courses', align: 'right', sort: n, cell: (c) => `${n(c)} (${pub(c)} published)` },
      ]}
      form={(c, set, e) => (
        <>
          <Field label="Name" required error={e.name} className="sm:col-span-2">{(p) => <Input {...p} value={c.name} onChange={(ev) => set({ name: ev.target.value })} />}</Field>
          <Field label="Description" className="sm:col-span-2">{(p) => <Textarea {...p} value={c.description} onChange={(ev) => set({ description: ev.target.value })} />}</Field>
          <Field label="Icon">{(p) => <Select {...p} value={c.icon} onChange={(ev) => set({ icon: ev.target.value })}>{Object.keys(SUBJECT_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}</Select>}</Field>
          <Field label={`Cover hue (${c.hue}°)`} error={e.hue} hint="Tints generated course covers in this category.">{(p) => <input {...p} type="range" min={0} max={360} value={c.hue} onChange={(ev) => set({ hue: Number(ev.target.value) })} className="mt-2 w-full accent-[var(--primary)]" style={{ background: 'none' }} />}</Field>
        </>
      )}
    />
  )
}
