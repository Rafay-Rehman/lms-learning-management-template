import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Database, Eye, Plus, Save, Trash2, Upload } from 'lucide-react'
import type { Quiz, ReviewPolicy } from '@/types'
import { NotFound } from '@/app/App'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { Dialog } from '@/components/ui/Overlay'
import { EmptyState, PageHeader, SearchInput, Section, Segmented } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { gradeAttempt, questionTypeLabel, validateQuiz } from '@/services/assessment'
import { uid } from '@/state/actions'
import { useMe, useStaffBase, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'
import { blankQuestion, QuestionEditor } from './QuestionEditor'
import { QuestionView } from './QuestionView'

function BankPicker({ open, onClose, onAdd, courseId }: { open: boolean; onClose: () => void; onAdd: (ids: string[]) => void; courseId: string }) {
  const { data } = useStore()
  const course = data.courses.find((c) => c.id === courseId)
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<'course' | 'subject' | 'all'>('course')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const items = data.bank.filter((b) => b.status === 'active' && (scope === 'all' || (scope === 'course' ? b.courseId === courseId : !!course?.subjectId && b.subjectId === course.subjectId)) && (!q || [b.text, b.topic, ...b.tags].some((s) => s.toLowerCase().includes(q.toLowerCase()))))
  return (
    <Dialog open={open} onClose={onClose} title="Add from question bank" description="Questions are copied into this quiz, so later bank edits don’t change it." size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!picked.size} onClick={() => (onAdd([...picked]), setPicked(new Set()))}>Add {picked.size || ''} question{picked.size === 1 ? '' : 's'}</Button></>}>
      <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search questions, topics, tags" className="min-w-52 flex-1" />
        <Segmented label="Scope" value={scope} onChange={setScope} options={[{ value: 'course', label: 'This course' }, { value: 'subject', label: 'Same subject' }, { value: 'all', label: 'All' }]} />
      </div>
      <ul className="divide-y divide-line">
        {items.length === 0 && <li className="p-8 text-center text-sm text-muted">No active questions match.</li>}
        {items.map((b) => (
          <li key={b.id} className="px-5 py-3">
            <Checkbox
              checked={picked.has(b.id)}
              onChange={(v) => setPicked((s) => { const n = new Set(s); v ? n.add(b.id) : n.delete(b.id); return n })}
              label={<span><span className="block text-sm">{b.text}</span><span className="text-xs text-muted">{questionTypeLabel[b.type]} · {b.topic} · {b.difficulty} · {b.points} pt</span></span>}
            />
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

export default function QuizBuilderPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { data, actions } = useStore()
  const me = useMe()
  const toast = useToast()
  const navigate = useNavigate()
  const base = useStaffBase()
  const courses = useTeachingCourses().filter((c) => c.status !== 'archived')
  const existing = data.quizzes.find((q) => q.id === id)
  const initial = useMemo<Quiz | null>(() => {
    if (existing) return structuredClone(existing)
    if (id !== 'new') return null
    const at = new Date().toISOString()
    return { id: uid('quiz'), courseId: params.get('course') ?? courses[0]?.id ?? '', kind: params.get('kind') === 'exam' ? 'exam' : 'quiz', title: '', description: '', instructions: 'Take your time. You can move between questions before you submit.', questions: [blankQuestion()], passingScore: 70, timeLimitMinutes: null, maxAttempts: 3, availableFrom: null, availableUntil: null, review: 'after_submit', status: 'draft', createdAt: at, updatedAt: at }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [quiz, setQuiz] = useState<Quiz | null>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [bank, setBank] = useState(false)
  const [preview, setPreview] = useState<Record<string, string[]>>({})
  const [checked, setChecked] = useState(false)
  if (!quiz) return <NotFound />
  if (existing && !courses.some((c) => c.id === existing.courseId) && me.role !== 'admin') return <NotFound />
  const set = (p: Partial<Quiz>) => setQuiz((q) => ({ ...q!, ...p }))
  const route = location.pathname.startsWith('/admin/exams') ? '/admin/exams' : `${base}/quizzes`
  const dirty = JSON.stringify(quiz) !== JSON.stringify(existing ?? initial) || !existing
  const pubErrors = validateQuiz(quiz, true)
  const attempts = data.attempts.filter((a) => a.quizId === quiz.id).length

  const save = (status = quiz.status) => {
    const next = { ...quiz, status }
    const r = actions.saveQuiz(next)
    if (!r.ok) {
      setErrors(r.errors)
      return toast(Object.values(r.errors)[0], { tone: 'error' })
    }
    setErrors({})
    setQuiz(next)
    toast(status === 'published' && quiz.status !== 'published' ? 'Quiz published' : status === 'draft' && quiz.status === 'published' ? 'Quiz unpublished' : 'Quiz saved')
    if (!existing) navigate(`${route}/${next.id}`, { replace: true })
  }
  const moveQ = (i: number, d: number) => {
    const qs = [...quiz.questions]
    const j = i + d
    if (j < 0 || j >= qs.length) return
    ;[qs[i], qs[j]] = [qs[j], qs[i]]
    set({ questions: qs })
  }
  const total = quiz.questions.reduce((s, q) => s + q.points, 0)
  const result = checked ? gradeAttempt(quiz, preview) : null

  return (
    <div>
      <Link to={route} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All {route.endsWith('exams') ? 'exams' : 'quizzes'}</Link>
      <PageHeader
        title={quiz.title || (existing ? 'Untitled quiz' : `New ${quiz.kind}`)}
        description={<span className="flex flex-wrap items-center gap-2"><Badge color={quiz.status === 'published' ? 'var(--success)' : 'var(--faint)'}>{quiz.status === 'published' ? 'Published' : 'Draft'}</Badge>{quiz.questions.length} questions · {total} points{attempts > 0 && ` · ${attempts} attempts so far`}{dirty && existing && <span className="font-medium text-warning">Unsaved changes</span>}</span>}
        actions={
          <>
            <Segmented label="Mode" value={mode} onChange={(m) => (setMode(m), setPreview({}), setChecked(false))} options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview', icon: <Eye /> }]} />
            <Button icon={<Save />} onClick={() => save()}>Save</Button>
            {quiz.status === 'draft' ? <Button variant="primary" icon={<Upload />} onClick={() => save('published')}>Publish</Button> : <Button onClick={() => save('draft')}>Unpublish</Button>}
          </>
        }
      />
      {attempts > 0 && mode === 'edit' && <p className="mb-4 rounded-[var(--r-ctl)] border border-warning/30 bg-warning/10 p-3 text-sm">Students have already attempted this quiz. Their recorded scores won’t change, but new attempts use your edits.</p>}

      {mode === 'preview' ? (
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-sm text-muted">This is what students see. Answers here aren’t saved.</p>
          {quiz.questions.map((q, i) => <div key={q.id} className="panel p-5"><QuestionView q={q} index={i} answer={preview[q.id] ?? []} onChange={checked ? undefined : (a) => setPreview({ ...preview, [q.id]: a })} review={checked} /></div>)}
          <div className="flex items-center gap-3">
            {checked ? <Button onClick={() => (setPreview({}), setChecked(false))}>Reset preview</Button> : <Button variant="primary" onClick={() => setChecked(true)}>Check answers</Button>}
            {result && <span className="text-sm">Score {result.score}/{result.maxScore}{result.pending ? ` · ${result.pending} written answer(s) need manual grading` : ''} · {result.maxScore && result.score / result.maxScore * 100 >= quiz.passingScore ? 'would pass' : 'would not pass'}</span>}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-4">
            {errors.questions && <p className="rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger" role="alert">{errors.questions}</p>}
            {quiz.questions.length === 0 && <EmptyState icon={<Plus />} title="No questions yet" body="Add a question, or pick some from the question bank." className="panel" />}
            {quiz.questions.map((q, i) => (
              <section key={q.id} className="panel p-5" aria-label={`Question ${i + 1}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-display text-lg font-semibold">Question {i + 1}</span>
                  {q.sourceId && <Badge title="Copied from the question bank">From bank</Badge>}
                  <span className="flex-1" />
                  <Button size="icon-sm" variant="ghost" aria-label={`Move question ${i + 1} up`} disabled={i === 0} icon={<ArrowUp />} onClick={() => moveQ(i, -1)} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Move question ${i + 1} down`} disabled={i === quiz.questions.length - 1} icon={<ArrowDown />} onClick={() => moveQ(i, 1)} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Duplicate question ${i + 1}`} icon={<Copy />} onClick={() => { const c = structuredClone(q); c.id = uid('q'); c.options = c.options.map((o) => { const nid = uid('o'); c.correct = c.correct.map((x) => (x === o.id ? nid : x)); return { ...o, id: nid } }); set({ questions: [...quiz.questions.slice(0, i + 1), c, ...quiz.questions.slice(i + 1)] }) }} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Delete question ${i + 1}`} icon={<Trash2 />} onClick={() => set({ questions: quiz.questions.filter((x) => x.id !== q.id) })} />
                </div>
                <QuestionEditor q={q} onChange={(n) => set({ questions: quiz.questions.map((x) => (x.id === q.id ? n : x)) })} />
              </section>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button icon={<Plus />} onClick={() => set({ questions: [...quiz.questions, blankQuestion()] })}>Add question</Button>
              <Button icon={<Database />} onClick={() => setBank(true)}>Add from question bank</Button>
            </div>
          </div>
          <div className="space-y-6">
            <Section title="Details">
              <div className="space-y-4">
                <Field label="Title" required error={errors.title}>{(p) => <Input {...p} value={quiz.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
                <Field label="Course" required error={errors.courseId}>{(p) => <Select {...p} value={quiz.courseId} onChange={(e) => set({ courseId: e.target.value })} disabled={attempts > 0}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>}</Field>
                <Field label="Kind">{(p) => <Select {...p} value={quiz.kind} onChange={(e) => set({ kind: e.target.value as Quiz['kind'] })}><option value="quiz">Quiz</option><option value="exam">Exam</option></Select>}</Field>
                <Field label="Description">{(p) => <Textarea {...p} value={quiz.description} onChange={(e) => set({ description: e.target.value })} className="min-h-16" />}</Field>
                <Field label="Instructions">{(p) => <Textarea {...p} value={quiz.instructions} onChange={(e) => set({ instructions: e.target.value })} className="min-h-16" />}</Field>
              </div>
            </Section>
            <Section title="Rules">
              <div className="space-y-4">
                <Field label="Passing score (%)" error={errors.passingScore}>{(p) => <Input {...p} type="number" min={0} max={100} value={quiz.passingScore} onChange={(e) => set({ passingScore: Number(e.target.value) })} />}</Field>
                <Switch label="Time limit" checked={quiz.timeLimitMinutes !== null} onChange={(v) => set({ timeLimitMinutes: v ? 20 : null })} />
                {quiz.timeLimitMinutes !== null && <Field label="Minutes" error={errors.timeLimitMinutes}>{(p) => <Input {...p} type="number" min={1} max={600} value={quiz.timeLimitMinutes!} onChange={(e) => set({ timeLimitMinutes: Number(e.target.value) })} />}</Field>}
                <Switch label="Limit attempts" checked={quiz.maxAttempts !== null} onChange={(v) => set({ maxAttempts: v ? 3 : null })} />
                {quiz.maxAttempts !== null && <Field label="Attempts allowed" error={errors.maxAttempts}>{(p) => <Input {...p} type="number" min={1} max={20} value={quiz.maxAttempts!} onChange={(e) => set({ maxAttempts: Number(e.target.value) })} />}</Field>}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Opens">{(p) => <Input {...p} type="date" value={quiz.availableFrom ?? ''} onChange={(e) => set({ availableFrom: e.target.value || null })} />}</Field>
                  <Field label="Due / closes" error={errors.availableUntil}>{(p) => <Input {...p} type="date" value={quiz.availableUntil ?? ''} onChange={(e) => set({ availableUntil: e.target.value || null })} />}</Field>
                </div>
                <Field label="Show correct answers">{(p) => <Select {...p} value={quiz.review} onChange={(e) => set({ review: e.target.value as ReviewPolicy })}><option value="after_submit">After each submission</option><option value="after_pass">Only after passing</option><option value="never">Never</option></Select>}</Field>
              </div>
            </Section>
            <Section title="Ready to publish?">
              {Object.keys(pubErrors).length ? <ul className="list-disc space-y-1 pl-5 text-sm text-warning">{Object.values(pubErrors).map((e) => <li key={e}>{e}</li>)}</ul> : <p className="text-sm text-success">Every question has valid answers.</p>}
              <p className="mt-3 text-xs text-faint">Attach the quiz to a lesson in the course builder so it appears in the curriculum.</p>
            </Section>
          </div>
        </div>
      )}
      <BankPicker open={bank} onClose={() => setBank(false)} courseId={quiz.courseId} onAdd={(ids) => {
        // Copy, never share: each quiz owns its question and option records.
        const copies = ids.map((bid) => {
          const b = data.bank.find((x) => x.id === bid)!
          const map = new Map(b.options.map((o) => [o.id, uid('o')]))
          return { id: uid('q'), type: b.type, text: b.text, explanation: b.explanation, points: b.points, sourceId: b.id, options: b.options.map((o) => ({ id: map.get(o.id)!, text: o.text })), correct: b.type === 'short' ? [...b.correct] : b.correct.map((c) => map.get(c)!).filter(Boolean) }
        })
        set({ questions: [...quiz.questions.filter((q) => q.text.trim() || q.options.some((o) => o.text)), ...copies] })
        setBank(false)
        toast(`Added ${copies.length} question${copies.length === 1 ? '' : 's'}`)
      }} />
    </div>
  )
}
