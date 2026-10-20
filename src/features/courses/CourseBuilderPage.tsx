import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Check, CircleAlert, Eye, ImagePlus, PenLine, Plus, Save, Send, Trash2, Upload, X } from 'lucide-react'
import type { Course, Lesson, LessonType, Level, Resource, Section as CourseSection } from '@/types'
import { CourseArt } from '@/components/courses/CourseArt'
import { StatusBadge } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { PageHeader, Section, Tabs } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { lessonIcon, lessonTypeLabel } from '@/features/public/CourseDetailPage'
import { cn } from '@/lib/cn'
import { formatMinutes, today } from '@/lib/date'
import { readImage } from '@/lib/files'
import { uid } from '@/state/actions'
import { courseStatusMeta, isSafeUrl, lessonProblem, publishProblems, slugify, validateCourse } from '@/services/courses'
import { courseMinutes } from '@/services/learning'
import { can } from '@/services/permissions'
import { report, useMe, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

const blankLesson = (type: LessonType = 'video'): Lesson => ({ id: uid('l'), title: '', type, durationMinutes: 10, required: true, preview: false, summary: '', body: '', videoUrl: '', url: '', quizId: null, resources: [] })

function newCourse(instructorId: string, categoryId: string): Course {
  const at = new Date().toISOString()
  return {
    id: uid('c'), slug: '', title: '', shortDescription: '', description: '', categoryId, subjectId: null, instructorId, termId: null, level: 'beginner', estimatedHours: 5,
    objectives: [''], prerequisites: [], tags: [], price: 0, status: 'draft', publishedAt: null, publishOn: null, awardsCertificate: true, thumbnail: null, artSeed: Math.floor(Math.random() * 100),
    sections: [{ id: uid('s'), title: 'Getting started', lessons: [] }], createdAt: at, updatedAt: at,
  }
}

/** Editable list of short strings (objectives, prerequisites). */
function ListEditor({ label, items, onChange, placeholder, error }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string; error?: string }) {
  return (
    <fieldset>
      <legend className="text-[13px] font-medium">{label}</legend>
      <ul className="mt-1.5 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <Input aria-label={`${label} ${i + 1}`} value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
            <Button variant="ghost" size="icon" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} icon={<X />} onClick={() => onChange(items.filter((_, k) => k !== i))} />
          </li>
        ))}
      </ul>
      <Button size="sm" variant="ghost" className="mt-2" icon={<Plus />} onClick={() => onChange([...items, ''])}>Add</Button>
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </fieldset>
  )
}

function LessonDialog({ lesson, course, sections, sectionId, onSave, onClose }: { lesson: Lesson | null; course: Course; sections: CourseSection[]; sectionId: string; onSave: (l: Lesson, sectionId: string) => void; onClose: () => void }) {
  const { data } = useStore()
  const [l, setL] = useState<Lesson>(lesson ?? blankLesson())
  const [sec, setSec] = useState(sectionId)
  const [error, setError] = useState('')
  useEffect(() => {
    if (lesson) (setL(lesson), setSec(sectionId), setError(''))
  }, [lesson, sectionId])
  const set = (p: Partial<Lesson>) => setL((x) => ({ ...x, ...p }))
  const quizzes = data.quizzes.filter((q) => q.courseId === course.id)
  const save = () => {
    const p = lessonProblem(l, data, course.id)
    if (p) return setError(`This lesson ${p}.`)
    onSave({ ...l, title: l.title.trim(), resources: l.resources.filter((r) => r.title.trim() || r.url.trim()) }, sec)
  }
  const setRes = (i: number, p: Partial<Resource>) => set({ resources: l.resources.map((r, k) => (k === i ? { ...r, ...p } : r)) })
  return (
    <Dialog open={!!lesson} onClose={onClose} title={lesson?.title ? 'Edit lesson' : 'New lesson'} size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save lesson</Button></>}>
      <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save())}>
        {error && <p className="rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger sm:col-span-2" role="alert">{error}</p>}
        <Field label="Lesson title" required className="sm:col-span-2">{(p) => <Input {...p} value={l.title} onChange={(e) => set({ title: e.target.value })} autoFocus />}</Field>
        <Field label="Type">{(p) => <Select {...p} value={l.type} onChange={(e) => set({ type: e.target.value as LessonType })}>{(Object.keys(lessonTypeLabel) as LessonType[]).map((t) => <option key={t} value={t}>{lessonTypeLabel[t]}</option>)}</Select>}</Field>
        <Field label="Duration (minutes)">{(p) => <Input {...p} type="number" min={1} max={600} value={l.durationMinutes} onChange={(e) => set({ durationMinutes: Number(e.target.value) })} />}</Field>
        <Field label="Section">{(p) => <Select {...p} value={sec} onChange={(e) => setSec(e.target.value)}>{sections.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.title || 'Untitled section'}</option>)}</Select>}</Field>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <Checkbox label="Required to complete the course" checked={l.required} onChange={(v) => set({ required: v })} />
          <Checkbox label="Free preview for visitors" checked={l.preview} onChange={(v) => set({ preview: v })} />
        </div>
        {l.type === 'video' && <Field label="Video URL" hint="An https MP4/WebM file, or a YouTube or Vimeo link. Leave empty to show a labeled placeholder." className="sm:col-span-2">{(p) => <Input {...p} value={l.videoUrl} onChange={(e) => set({ videoUrl: e.target.value.trim() })} placeholder="https://" />}</Field>}
        {(l.type === 'pdf' || l.type === 'link') && <Field label={l.type === 'pdf' ? 'PDF URL' : 'Resource URL'} required hint="https:// address, or a file bundled under /assets." className="sm:col-span-2">{(p) => <Input {...p} value={l.url} onChange={(e) => set({ url: e.target.value.trim() })} placeholder="https://" />}</Field>}
        {l.type === 'quiz' && (
          <Field label="Quiz" required hint={quizzes.length ? 'Students complete this lesson by passing the quiz.' : 'This course has no quizzes yet — create one in the Quiz Builder first.'} className="sm:col-span-2">
            {(p) => <Select {...p} value={l.quizId ?? ''} onChange={(e) => set({ quizId: e.target.value || null })}><option value="">Choose a quiz…</option>{quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}{q.status === 'draft' ? ' (draft)' : ''}</option>)}</Select>}
          </Field>
        )}
        <Field label="Summary" hint="One or two sentences shown under the lesson." className="sm:col-span-2">{(p) => <Textarea {...p} value={l.summary} onChange={(e) => set({ summary: e.target.value })} className="min-h-16" />}</Field>
        {l.type === 'text' && <Field label="Lesson text" hint="Blank line = new paragraph. “## ” starts a heading, “- ” a bullet, **bold**, *italic*, `code`." className="sm:col-span-2">{(p) => <Textarea {...p} value={l.body} onChange={(e) => set({ body: e.target.value })} className="min-h-56 font-mono text-[13px]" />}</Field>}
        <fieldset className="sm:col-span-2">
          <legend className="text-[13px] font-medium">Resources</legend>
          <ul className="mt-1.5 space-y-2">
            {l.resources.map((r, i) => (
              <li key={r.id} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto_auto]">
                <Input aria-label="Resource title" value={r.title} placeholder="Title" onChange={(e) => setRes(i, { title: e.target.value })} />
                <Input aria-label="Resource URL" value={r.url} placeholder="https:// or /assets/…" aria-invalid={r.url && !isSafeUrl(r.url) ? true : undefined} onChange={(e) => setRes(i, { url: e.target.value.trim() })} />
                <Select aria-label="Resource kind" value={r.kind} onChange={(e) => setRes(i, { kind: e.target.value as Resource['kind'] })}><option value="file">Download</option><option value="link">Link</option></Select>
                <Button variant="ghost" size="icon" aria-label="Remove resource" icon={<X />} onClick={() => set({ resources: l.resources.filter((_, k) => k !== i) })} />
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-2" icon={<Plus />} onClick={() => set({ resources: [...l.resources, { id: uid('r'), title: '', url: '', kind: 'link' }] })}>Add resource</Button>
        </fieldset>
      </form>
    </Dialog>
  )
}

function Check2({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <li className="flex items-start gap-2 text-sm">{ok ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Done" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-label="To do" />}<span className={ok ? 'text-muted' : ''}>{children}</span></li>
}

export default function CourseBuilderPage() {
  const { data, actions } = useStore()
  const me = useMe()
  const toast = useToast()
  const [confirm, confirmDialog] = useConfirm()
  const [params, setParams] = useSearchParams()
  const courses = useTeachingCourses()
  const id = params.get('course')
  const saved = courses.find((c) => c.id === id)
  const fresh = useMemo(() => newCourse(me.role === 'instructor' ? me.id : data.users.find((u) => u.role === 'instructor')!.id, data.categories[0]?.id ?? ''), [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Course>(saved ?? fresh)
  const [tab, setTab] = useState<'basics' | 'curriculum' | 'publish'>((params.get('tab') as 'curriculum') ?? 'basics')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ lesson: Lesson; sectionId: string } | null>(null)
  const [tags, setTags] = useState((saved ?? fresh).tags.join(', '))
  // Bumped after a save so the form reloads the normalised record from the store.
  const [sync, setSync] = useState(0)

  useEffect(() => {
    const c = courses.find((x) => x.id === id) ?? fresh
    setDraft(c)
    setTags(c.tags.join(', '))
    setErrors({})
  }, [id, sync]) // eslint-disable-line react-hooks/exhaustive-deps

  const isNew = !saved
  const current = { ...draft, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), slug: saved && saved.title === draft.title.trim() ? saved.slug : slugify(draft.title) }
  const dirty = isNew ? !!draft.title : JSON.stringify({ ...current, slug: '' }) !== JSON.stringify({ ...saved, slug: '' })
  const set = (p: Partial<Course>) => setDraft((d) => ({ ...d, ...p }))
  const setSections = (fn: (s: CourseSection[]) => CourseSection[]) => setDraft((d) => ({ ...d, sections: fn(d.sections) }))
  const publisher = can(me, 'course.publish') || !data.settings.publication.requireReview
  const basicErrors = validateCourse(current, data)
  const problems = publishProblems(current, data.settings)

  const save = (): boolean => {
    const r = actions.saveCourse(current)
    if (!r.ok) {
      setErrors(r.errors)
      if (r.errors.curriculum) setTab('curriculum')
      else if (Object.keys(r.errors).some((k) => k !== 'form')) setTab('basics')
      toast(Object.values(r.errors)[0], { tone: 'error' })
      return false
    }
    setErrors({})
    toast(isNew ? 'Course created as a draft' : 'Changes saved')
    if (isNew) setParams({ course: current.id }, { replace: true })
    setSync((n) => n + 1)
    return true
  }
  const publish = () => {
    if (dirty && !save()) return
    const r = actions.setCourseStatus(current.id, 'published')
    if (report(toast, r)) {
      const s = (r as { id: string }).id
      toast(s === 'review' ? 'Sent to an administrator for review' : 'Course published — it’s now in the catalog')
      setSync((n) => n + 1)
    }
  }
  const switchTo = (next: string) => {
    const go = () => setParams(next ? { course: next } : {}, { replace: true })
    dirty ? confirm({ title: 'Discard unsaved changes?', body: 'You have changes to this course that haven’t been saved.', confirmLabel: 'Discard changes', onConfirm: go }) : go()
  }
  const move = <T,>(xs: T[], i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= xs.length) return xs
    const out = [...xs]
    ;[out[i], out[j]] = [out[j], out[i]]
    return out
  }
  const saveLesson = (l: Lesson, sectionId: string) => {
    setSections((ss) => {
      const exists = ss.some((s) => s.lessons.some((x) => x.id === l.id))
      const from = ss.find((s) => s.lessons.some((x) => x.id === l.id))
      return ss.map((s) => {
        if (exists && from && from.id === sectionId && s.id === sectionId) return { ...s, lessons: s.lessons.map((x) => (x.id === l.id ? l : x)) }
        const without = s.lessons.filter((x) => x.id !== l.id)
        return s.id === sectionId ? { ...s, lessons: [...without, l] } : { ...s, lessons: without }
      })
    })
    setEditing(null)
    toast('Lesson updated — save the course to keep it')
  }

  const lessons = draft.sections.flatMap((s) => s.lessons)
  return (
    <div>
      <PageHeader
        title={isNew ? 'New course' : draft.title || 'Untitled course'}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge meta={courseStatusMeta[draft.status]} />
            <span>{draft.sections.length} sections · {lessons.length} lessons · {formatMinutes(courseMinutes(draft))}</span>
            {dirty && <span className="font-medium text-warning">Unsaved changes</span>}
          </span>
        }
        actions={
          <>
            <Select aria-label="Course to edit" value={saved ? draft.id : ''} onChange={(e) => switchTo(e.target.value)} className="w-56">
              <option value="">+ New course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            {!isNew && <ButtonLink to={`/learn/course/${draft.id}/overview`} icon={<Eye />}>Preview</ButtonLink>}
            <Button variant="primary" icon={<Save />} onClick={save} disabled={!dirty && !isNew}>Save</Button>
          </>
        }
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'basics', label: 'Basic information' }, { value: 'curriculum', label: 'Curriculum', count: lessons.length }, { value: 'publish', label: 'Publication' }]} />
      <div className="pt-6">
        {tab === 'basics' && (
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <Section title="Course details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" required error={errors.title} className="sm:col-span-2">{(p) => <Input {...p} value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} />}</Field>
                <Field label="Short description" required error={errors.shortDescription} hint={`${draft.shortDescription.length}/200 · shown on catalog cards`} className="sm:col-span-2">{(p) => <Input {...p} value={draft.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} maxLength={200} />}</Field>
                <Field label="Full description" hint="Shown on the course page. At least 80 characters to publish." className="sm:col-span-2">{(p) => <Textarea {...p} value={draft.description} onChange={(e) => set({ description: e.target.value })} className="min-h-32" />}</Field>
                <Field label="Category" required error={errors.categoryId}>{(p) => <Select {...p} value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
                {data.settings.academic.subjects && <Field label="Subject" error={errors.subjectId} hint="Optional — links the course to an academic subject.">{(p) => <Select {...p} value={draft.subjectId ?? ''} onChange={(e) => set({ subjectId: e.target.value || null })}><option value="">No subject</option>{data.subjects.filter((s) => s.status !== 'archived' || s.id === draft.subjectId).map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}{s.status !== 'active' ? ` (${s.status})` : ''}</option>)}</Select>}</Field>}
                {me.role === 'admin' && <Field label="Instructor" required error={errors.instructorId}>{(p) => <Select {...p} value={draft.instructorId} onChange={(e) => set({ instructorId: e.target.value })}>{data.users.filter((u) => u.role === 'instructor' && (u.active || u.id === draft.instructorId)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}</Field>}
                {data.settings.academic.terms && <Field label="Term">{(p) => <Select {...p} value={draft.termId ?? ''} onChange={(e) => set({ termId: e.target.value || null })}><option value="">Self-paced (no term)</option>{data.terms.filter((t) => t.status !== 'archived' || t.id === draft.termId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}</Field>}
                <Field label="Difficulty">{(p) => <Select {...p} value={draft.level} onChange={(e) => set({ level: e.target.value as Level })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></Select>}</Field>
                <Field label="Estimated duration (hours)" error={errors.estimatedHours}>{(p) => <Input {...p} type="number" min={1} max={500} value={draft.estimatedHours} onChange={(e) => set({ estimatedHours: Number(e.target.value) })} />}</Field>
                <Field label="Price (USD)" error={errors.price} hint="0 makes the course free. No payments are taken in this demo.">{(p) => <Input {...p} type="number" min={0} step={1} value={draft.price} onChange={(e) => set({ price: Number(e.target.value) })} />}</Field>
                <Field label="Tags" hint="Comma separated — used by search." className="sm:col-span-2">{(p) => <Input {...p} value={tags} onChange={(e) => setTags(e.target.value)} />}</Field>
                <div className="sm:col-span-2"><ListEditor label="Learning objectives" items={draft.objectives} onChange={(v) => set({ objectives: v })} placeholder="Students will be able to…" /></div>
                <div className="sm:col-span-2"><ListEditor label="Prerequisites" items={draft.prerequisites} onChange={(v) => set({ prerequisites: v })} placeholder="e.g. Basic algebra" /></div>
              </div>
            </Section>
            <div className="space-y-6">
              <Section title="Thumbnail">
                <CourseArt course={draft} className="rounded-[var(--r-ctl)]" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--r-btn)] border border-line px-2.5 text-[13px] font-medium hover:bg-surface-2">
                    <ImagePlus className="size-4" />Upload image
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => { const r = await readImage(e.target.files?.[0]); e.target.value = ''; 'url' in r ? set({ thumbnail: r.url }) : toast(r.error, { tone: 'error' }) }} />
                  </label>
                  {draft.thumbnail ? <Button size="sm" variant="ghost" onClick={() => set({ thumbnail: null })}>Use generated art</Button> : <Button size="sm" variant="ghost" onClick={() => set({ artSeed: draft.artSeed + 1 })}>Try another pattern</Button>}
                </div>
                <p className="mt-2 text-xs text-faint">Without an upload, a cover is generated from the category color. Uploads are stored in this browser only.</p>
              </Section>
              <Section title="Completion">
                <Switch label="Award a certificate" description="Issued automatically when a student completes every required lesson." checked={draft.awardsCertificate} onChange={(v) => set({ awardsCertificate: v })} />
              </Section>
            </div>
          </div>
        )}

        {tab === 'curriculum' && (
          <div className="space-y-4">
            {errors.curriculum && <p className="rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger" role="alert">{errors.curriculum}</p>}
            <p className="text-sm text-muted">Reorder with the arrow buttons. Changes apply when you save the course.</p>
            {draft.sections.map((s, si) => (
              <section key={s.id} className="panel">
                <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                  <span className="text-sm font-semibold text-muted tabular">{si + 1}</span>
                  <Input aria-label={`Section ${si + 1} title`} value={s.title} placeholder="Section title" className="min-w-0 flex-1 font-medium" onChange={(e) => setSections((ss) => ss.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Move section ${si + 1} up`} disabled={si === 0} icon={<ArrowUp />} onClick={() => setSections((ss) => move(ss, si, -1))} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Move section ${si + 1} down`} disabled={si === draft.sections.length - 1} icon={<ArrowDown />} onClick={() => setSections((ss) => move(ss, si, 1))} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Delete section ${si + 1}`} icon={<Trash2 />} onClick={() => (s.lessons.length ? confirm({ title: `Delete “${s.title || 'Untitled section'}”?`, body: `Its ${s.lessons.length} lesson${s.lessons.length > 1 ? 's' : ''} will be removed when you save. Student progress on removed lessons no longer counts toward completion.`, confirmLabel: 'Delete section', onConfirm: () => setSections((ss) => ss.filter((x) => x.id !== s.id)) }) : setSections((ss) => ss.filter((x) => x.id !== s.id)))} />
                </header>
                <ol className="divide-y divide-line">
                  {s.lessons.map((l, li) => {
                    const Icon = lessonIcon[l.type]
                    const problem = lessonProblem(l, data, draft.id)
                    return (
                      <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                        <Icon className="size-4 shrink-0 text-faint" aria-label={lessonTypeLabel[l.type]} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{l.title || <span className="text-faint">Untitled lesson</span>}</span>
                          <span className="block text-xs text-muted">{lessonTypeLabel[l.type]} · {l.durationMinutes} min{l.preview && ' · Preview'}{problem && <span className="text-danger"> · {problem}</span>}</span>
                        </span>
                        <button type="button" onClick={() => setSections((ss) => ss.map((x) => (x.id === s.id ? { ...x, lessons: x.lessons.map((y) => (y.id === l.id ? { ...y, required: !y.required } : y)) } : x)))} aria-pressed={l.required} className={cn('rounded-full px-2.5 py-1 text-xs font-medium', l.required ? 'bg-primary-soft text-primary' : 'bg-surface-3 text-muted')}>
                          {l.required ? 'Required' : 'Optional'}
                        </button>
                        <span className="flex">
                          <Button size="icon-sm" variant="ghost" aria-label={`Move ${l.title || 'lesson'} up`} disabled={li === 0} icon={<ArrowUp />} onClick={() => setSections((ss) => ss.map((x) => (x.id === s.id ? { ...x, lessons: move(x.lessons, li, -1) } : x)))} />
                          <Button size="icon-sm" variant="ghost" aria-label={`Move ${l.title || 'lesson'} down`} disabled={li === s.lessons.length - 1} icon={<ArrowDown />} onClick={() => setSections((ss) => ss.map((x) => (x.id === s.id ? { ...x, lessons: move(x.lessons, li, 1) } : x)))} />
                          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${l.title || 'lesson'}`} icon={<PenLine />} onClick={() => setEditing({ lesson: l, sectionId: s.id })} />
                          <Button size="icon-sm" variant="ghost" aria-label={`Delete ${l.title || 'lesson'}`} icon={<Trash2 />} onClick={() => setSections((ss) => ss.map((x) => (x.id === s.id ? { ...x, lessons: x.lessons.filter((y) => y.id !== l.id) } : x)))} />
                        </span>
                      </li>
                    )
                  })}
                  {!s.lessons.length && <li className="px-4 py-4 text-sm text-muted">No lessons in this section yet.</li>}
                </ol>
                <div className="border-t border-line px-4 py-2.5">
                  <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setEditing({ lesson: blankLesson(), sectionId: s.id })}>Add lesson</Button>
                </div>
              </section>
            ))}
            <Button icon={<Plus />} onClick={() => setSections((ss) => [...ss, { id: uid('s'), title: `Section ${ss.length + 1}`, lessons: [] }])}>Add section</Button>
          </div>
        )}

        {tab === 'publish' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Publication status">
              <div className="flex items-center gap-2"><StatusBadge meta={courseStatusMeta[draft.status]} /><span className="text-sm text-muted">{courseStatusMeta[draft.status].hint}</span></div>
              <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                {(['draft', 'review', 'published'] as const).map((s) => (
                  <li key={s} className={cn('rounded-[var(--r-ctl)] border px-2 py-2', draft.status === s ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-line text-muted')}>{courseStatusMeta[s].label}</li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-muted">{data.settings.publication.requireReview ? 'This platform requires an administrator to review courses before they’re published.' : 'Instructors can publish directly on this platform.'} Unpublishing removes a course from the catalog; enrolled students keep access.</p>
              <Field label="Planned publication date" hint="Optional. Shown to administrators reviewing the course; publishing itself is a manual step in this demo." className="mt-4">
                {(p) => <Input {...p} type="date" min={today()} value={draft.publishOn ?? ''} onChange={(e) => set({ publishOn: e.target.value || null })} className="w-48" />}
              </Field>
              <div className="mt-5 flex flex-wrap gap-2">
                {draft.status === 'draft' && <Button variant="primary" icon={publisher ? <Upload /> : <Send />} onClick={publish} disabled={isNew && !draft.title}>{publisher ? 'Publish course' : 'Submit for review'}</Button>}
                {draft.status === 'review' && can(me, 'course.publish') && <Button variant="primary" icon={<Upload />} onClick={publish}>Approve and publish</Button>}
                {(draft.status === 'published' || draft.status === 'review') && !isNew && <Button onClick={() => { if (report(toast, actions.setCourseStatus(draft.id, 'draft'), draft.status === 'published' ? 'Unpublished — enrolled students keep access' : 'Returned to draft')) setSync((n) => n + 1) }}>{draft.status === 'published' ? 'Unpublish' : 'Withdraw from review'}</Button>}
                {draft.status === 'archived' && <Button onClick={() => { if (report(toast, actions.setCourseStatus(draft.id, 'draft'), 'Restored to draft')) setSync((n) => n + 1) }}>Restore to draft</Button>}
              </div>
            </Section>
            <Section title="Ready to publish?">
              <ul className="space-y-2">
                <Check2 ok={!basicErrors.title}>Title</Check2>
                <Check2 ok={!basicErrors.shortDescription}>Short description</Check2>
                <Check2 ok={!basicErrors.categoryId}>Category</Check2>
                <Check2 ok={draft.description.trim().length >= 80}>Full description (80+ characters)</Check2>
                <Check2 ok={draft.objectives.some((o) => o.trim())}>At least one learning objective</Check2>
                <Check2 ok={lessons.length >= data.settings.publication.minLessons}>At least {data.settings.publication.minLessons} lessons ({lessons.length} now)</Check2>
                <Check2 ok={lessons.some((l) => l.required)}>At least one required lesson</Check2>
                <Check2 ok={!basicErrors.curriculum && !draft.sections.some((s) => !s.lessons.length)}>Every section has valid lessons</Check2>
              </ul>
              {problems.length === 0 && Object.keys(basicErrors).length === 0 && <p className="mt-4 text-sm font-medium text-success">Everything’s in place.</p>}
            </Section>
          </div>
        )}
      </div>
      <LessonDialog lesson={editing?.lesson ?? null} sectionId={editing?.sectionId ?? ''} course={draft} sections={draft.sections} onSave={saveLesson} onClose={() => setEditing(null)} />
      {confirmDialog}
      {!isNew && dirty && <div className="no-print sticky bottom-4 mt-6 flex justify-end"><div className="glass flex items-center gap-3 rounded-full border border-line px-4 py-2 text-sm shadow-lg"><span>Unsaved changes</span><Button size="sm" onClick={() => { setDraft(saved); setTags(saved.tags.join(', ')); setErrors({}) }}>Discard</Button><Button size="sm" variant="primary" onClick={save}>Save</Button></div></div>}
    </div>
  )
}
