import { useState } from 'react'
import type { AppData, Level, Subject } from '@/types'
import { Avatar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { SUBJECT_ICONS } from '@/components/ui/icons'
import { Dialog } from '@/components/ui/Overlay'
import { useToast } from '@/components/ui/Toast'
import { counts, lessonCount } from '@/services/learning'
import { useStore } from '@/state/store'

export const subjectStatusMeta = {
  draft: { label: 'Draft', color: 'var(--faint)' },
  active: { label: 'Active', color: 'var(--success)' },
  archived: { label: 'Archived', color: 'var(--muted)' },
}

/** Course, lesson and student totals for a subject — the same numbers on every page. */
export function subjectStats(data: AppData, subjectId: string) {
  const courses = data.courses.filter((c) => c.subjectId === subjectId)
  const ids = new Set(courses.map((c) => c.id))
  const enrollments = data.enrollments.filter((e) => ids.has(e.courseId) && counts(e.status))
  return {
    courses,
    lessons: courses.reduce((s, c) => s + lessonCount(c), 0),
    enrollments,
    students: new Set(enrollments.map((e) => e.userId)).size,
    completed: enrollments.filter((e) => e.status === 'completed').length,
  }
}

export function blankSubject(data: AppData): Subject {
  const at = new Date().toISOString()
  return { id: `sub-${crypto.randomUUID().slice(0, 8)}`, name: '', code: '', shortDescription: '', description: '', categoryId: data.subjectCategories[0]?.id ?? null, departmentId: null, instructorIds: [], yearId: data.academicYears.find((y) => y.status === 'active')?.id ?? null, termId: null, level: 'beginner', icon: 'book', status: 'draft', createdAt: at, updatedAt: at }
}

export function SubjectFields({ s, set, errors }: { s: Subject; set: (p: Partial<Subject>) => void; errors: Record<string, string> }) {
  const { data } = useStore()
  const ac = data.settings.academic
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Subject name" required error={errors.name}>{(p) => <Input {...p} value={s.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
      <Field label="Subject code" required error={errors.code} hint="Unique within the academic year, e.g. CS101">{(p) => <Input {...p} value={s.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} maxLength={11} />}</Field>
      <Field label="Short description" error={errors.shortDescription} className="sm:col-span-2">{(p) => <Input {...p} value={s.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} maxLength={200} />}</Field>
      <Field label="Detailed description" className="sm:col-span-2">{(p) => <Textarea {...p} value={s.description} onChange={(e) => set({ description: e.target.value })} />}</Field>
      <Field label="Category">{(p) => <Select {...p} value={s.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value || null })}><option value="">None</option>{data.subjectCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
      {ac.departments && <Field label="Department">{(p) => <Select {...p} value={s.departmentId ?? ''} onChange={(e) => set({ departmentId: e.target.value || null })}><option value="">None</option>{data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>}
      {ac.years && <Field label="Academic year" hint="Leave empty for subjects that run every year.">{(p) => <Select {...p} value={s.yearId ?? ''} onChange={(e) => set({ yearId: e.target.value || null, termId: null })}><option value="">Any year</option>{data.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</Select>}</Field>}
      {ac.terms && <Field label="Term" error={errors.termId}>{(p) => <Select {...p} value={s.termId ?? ''} onChange={(e) => set({ termId: e.target.value || null })} disabled={!s.yearId}><option value="">All terms</option>{data.terms.filter((t) => t.yearId === s.yearId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}</Field>}
      <Field label="Level">{(p) => <Select {...p} value={s.level} onChange={(e) => set({ level: e.target.value as Level })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></Select>}</Field>
      <Field label="Icon">{(p) => <Select {...p} value={s.icon} onChange={(e) => set({ icon: e.target.value })}>{Object.keys(SUBJECT_ICONS).map((k) => <option key={k}>{k}</option>)}</Select>}</Field>
      <Field label="Status">{(p) => <Select {...p} value={s.status} onChange={(e) => set({ status: e.target.value as Subject['status'] })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></Select>}</Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-[13px] font-medium">Assigned instructors</legend>
        {errors.instructorIds && <p className="text-xs text-danger" role="alert">{errors.instructorIds}</p>}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {data.users.filter((u) => u.role === 'instructor').map((u) => (
            <Checkbox key={u.id} checked={s.instructorIds.includes(u.id)} onChange={(v) => set({ instructorIds: v ? [...s.instructorIds, u.id] : s.instructorIds.filter((x) => x !== u.id) })} label={<span className="flex items-center gap-2"><Avatar user={u} size="xs" />{u.name}</span>} />
          ))}
        </div>
      </fieldset>
    </div>
  )
}

export function SubjectDialog({ value, onClose, onSaved }: { value: Subject | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const { data, actions } = useStore()
  const toast = useToast()
  const [s, setS] = useState<Subject | null>(value)
  const [errors, setErrors] = useState<Record<string, string>>({})
  if (value && s?.id !== value.id) (setS(value), setErrors({}))
  const isNew = !!value && !data.subjects.some((x) => x.id === value.id)
  const save = () => {
    const r = actions.saveSubject(s!)
    if (!r.ok) return setErrors(r.errors)
    toast(isNew ? `Subject ${s!.code} created` : 'Subject saved')
    onSaved?.(s!.id)
    onClose()
  }
  return (
    <Dialog open={!!value} onClose={onClose} title={isNew ? 'New subject' : 'Edit subject'} size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{isNew ? 'Create subject' : 'Save changes'}</Button></>}>
      {s && (
        <form className="p-5" onSubmit={(e) => (e.preventDefault(), save())} noValidate>
          {errors.form && <p className="mb-4 rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger" role="alert">{errors.form}</p>}
          <SubjectFields s={s} set={(p) => setS({ ...s, ...p })} errors={errors} />
        </form>
      )}
    </Dialog>
  )
}

