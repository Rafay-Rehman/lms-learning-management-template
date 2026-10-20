import { useMemo, useState } from 'react'
import { Copy, Database, Download, PenSquare, Plus, Trash2, Upload } from 'lucide-react'
import type { BankQuestion, Difficulty, QuestionType } from '@/types'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Field, Input, Select } from '@/components/ui/Field'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv, parseCsv } from '@/lib/csv'
import { questionTypeLabel } from '@/services/assessment'
import { uid } from '@/state/actions'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { blankQuestion, QuestionEditor } from './QuestionEditor'

const diffMeta: Record<Difficulty, { label: string; color: string }> = { easy: { label: 'Easy', color: 'var(--success)' }, medium: { label: 'Medium', color: 'var(--secondary)' }, hard: { label: 'Hard', color: 'var(--highlight)' } }
const HEADER = ['type', 'text', 'options', 'correct', 'points', 'difficulty', 'topic', 'subject_code', 'tags', 'explanation']

function BankForm({ value, onClose }: { value: BankQuestion | null; onClose: () => void }) {
  const { data, actions } = useStore()
  const toast = useToast()
  const [q, setQ] = useState<BankQuestion | null>(value)
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  if (value && q?.id !== value.id) (setQ(value), setTags(value.tags.join(', ')), setError(''))
  const set = (p: Partial<BankQuestion>) => setQ((x) => ({ ...x!, ...p }))
  const save = () => {
    const r = actions.saveBankQuestion({ ...q!, tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) })
    if (!r.ok) return setError(Object.values(r.errors)[0])
    toast('Question saved to the bank')
    onClose()
  }
  return (
    <Dialog open={!!value} onClose={onClose} title={value?.text ? 'Edit question' : 'New question'} size="xl" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save question</Button></>}>
      {q && (
        <div className="space-y-5 p-5">
          {error && <p className="rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
          <QuestionEditor q={q} onChange={(n) => setQ({ ...q, ...n })} showProblem={false} />
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <Field label="Subject">{(p) => <Select {...p} value={q.subjectId ?? ''} onChange={(e) => set({ subjectId: e.target.value || null })}><option value="">None</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</Select>}</Field>
            <Field label="Course">{(p) => <Select {...p} value={q.courseId ?? ''} onChange={(e) => set({ courseId: e.target.value || null })}><option value="">None</option>{data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>}</Field>
            <Field label="Topic or lesson">{(p) => <Input {...p} value={q.topic} onChange={(e) => set({ topic: e.target.value })} />}</Field>
            <Field label="Difficulty">{(p) => <Select {...p} value={q.difficulty} onChange={(e) => set({ difficulty: e.target.value as Difficulty })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></Select>}</Field>
            <Field label="Status" hint="Only active questions can be added to quizzes.">{(p) => <Select {...p} value={q.status} onChange={(e) => set({ status: e.target.value as BankQuestion['status'] })}><option value="active">Active</option><option value="draft">Draft</option><option value="retired">Retired</option></Select>}</Field>
            <Field label="Tags" hint="Comma separated">{(p) => <Input {...p} value={tags} onChange={(e) => setTags(e.target.value)} />}</Field>
          </div>
        </div>
      )}
    </Dialog>
  )
}

export default function QuestionBankPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const [confirm, dialog] = useConfirm()
  const [editing, setEditing] = useState<BankQuestion | null>(null)
  const [f, setF] = useState({ q: '', subject: '', course: '', type: '', difficulty: '', status: '' })
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v })
  const usage = useMemo(() => {
    const m = new Map<string, number>()
    for (const z of data.quizzes) for (const x of z.questions) if (x.sourceId) m.set(x.sourceId, (m.get(x.sourceId) ?? 0) + 1)
    return m
  }, [data.quizzes])
  const rows = data.bank.filter((b) => (!f.q || [b.text, b.topic, ...b.tags].some((s) => s.toLowerCase().includes(f.q.toLowerCase()))) && (!f.subject || b.subjectId === f.subject) && (!f.course || b.courseId === f.course) && (!f.type || b.type === f.type) && (!f.difficulty || b.difficulty === f.difficulty) && (!f.status || b.status === f.status))
  const blank = (): BankQuestion => ({ ...blankQuestion(), subjectId: f.subject || null, courseId: f.course || null, topic: '', tags: [], difficulty: 'medium', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  const duplicate = (b: BankQuestion) => {
    const map = new Map(b.options.map((o) => [o.id, uid('o')]))
    report(toast, actions.saveBankQuestion({ ...structuredClone(b), id: uid('bq'), text: `${b.text} (copy)`, options: b.options.map((o) => ({ ...o, id: map.get(o.id)! })), correct: b.type === 'short' ? [...b.correct] : b.correct.map((c) => map.get(c)!), createdAt: new Date().toISOString() }), 'Question duplicated')
  }
  const exportCsv = () =>
    downloadCsv('question-bank.csv', [HEADER, ...rows.map((b) => [b.type, b.text, b.options.map((o) => o.text).join('|'), b.type === 'short' ? b.correct.join('|') : b.correct.map((c) => b.options.findIndex((o) => o.id === c) + 1).join('|'), b.points, b.difficulty, b.topic, look.subject(b.subjectId)?.code ?? '', b.tags.join('|'), b.explanation])])
  const importCsv = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 500_000) return toast('Choose a CSV under 500 KB', { tone: 'error' })
    const [head, ...body] = parseCsv(await file.text())
    if (!head || HEADER.some((h, i) => head[i]?.trim().toLowerCase() !== h)) return toast(`The first row must be: ${HEADER.join(', ')}`, { tone: 'error' })
    const at = new Date().toISOString()
    const items: BankQuestion[] = body.map(([type, text, options, correct, points, difficulty, topic, code, tags, explanation]) => {
      const t = (Object.keys(questionTypeLabel).includes(type) ? type : 'single') as QuestionType
      const opts = t === 'short' ? [] : (t === 'true_false' && !options ? 'True|False' : options).split('|').map((x) => ({ id: uid('o'), text: x.trim() }))
      const corr = t === 'short' ? correct.split('|').map((x) => x.trim()).filter(Boolean) : correct.split('|').map((n) => opts[Number(n) - 1]?.id).filter(Boolean) as string[]
      return { id: uid('bq'), type: t, text: text ?? '', options: opts, correct: corr, points: Number(points) || 1, explanation: explanation ?? '', sourceId: null, difficulty: (['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium') as Difficulty, topic: topic ?? '', subjectId: data.subjects.find((s) => s.code === code?.trim().toUpperCase())?.id ?? null, courseId: null, tags: (tags ?? '').split('|').map((x) => x.trim()).filter(Boolean), status: 'draft', createdAt: at, updatedAt: at }
    })
    if (!items.length) return toast('No questions found in that file', { tone: 'error' })
    report(toast, actions.importBank(items), `Imported ${items.length} question${items.length === 1 ? '' : 's'} as drafts`)
  }

  return (
    <div>
      <PageHeader
        title="Question Bank"
        description="Reusable questions. Adding one to a quiz copies it, so editing the bank never changes an existing quiz."
        actions={
          <>
            <Button icon={<Download />} onClick={exportCsv}>Export CSV</Button>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface px-3.5 text-sm font-medium shadow-sm hover:bg-surface-2">
              <Upload className="size-4" />Import CSV
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => (importCsv(e.target.files?.[0]), (e.target.value = ''))} />
            </label>
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing(blank())}>New question</Button>
          </>
        }
      />
      <Toolbar>
        <SearchInput value={f.q} onChange={(v) => set('q', v)} placeholder="Search text, topic, tags" className="w-full sm:w-60" />
        <FilterSelect label="Subject" value={f.subject} onChange={(v) => set('subject', v)}><option value="">All subjects</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}</FilterSelect>
        <FilterSelect label="Course" value={f.course} onChange={(v) => set('course', v)}><option value="">All courses</option>{data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        <FilterSelect label="Type" value={f.type} onChange={(v) => set('type', v)}><option value="">All types</option>{(Object.keys(questionTypeLabel) as QuestionType[]).map((t) => <option key={t} value={t}>{questionTypeLabel[t]}</option>)}</FilterSelect>
        <FilterSelect label="Difficulty" value={f.difficulty} onChange={(v) => set('difficulty', v)}><option value="">Any difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></FilterSelect>
        <FilterSelect label="Status" value={f.status} onChange={(v) => set('status', v)}><option value="">Any status</option><option value="active">Active</option><option value="draft">Draft</option><option value="retired">Retired</option></FilterSelect>
      </Toolbar>
      <p className="mb-3 text-xs text-faint">CSV columns: {HEADER.join(', ')}. Separate options, correct answers and tags with “|”; correct answers are option numbers (or accepted text for short answers).</p>
      <div className="panel overflow-hidden">
        <DataTable
          label="Question bank"
          rows={rows}
          pageSize={20}
          onRowClick={setEditing}
          empty={<EmptyState icon={<Database />} title="No questions match" />}
          columns={[
            { key: 'text', header: 'Question', sort: (b) => b.text, cell: (b) => <span className="block max-w-96 truncate font-medium" title={b.text}>{b.text}</span> },
            { key: 'type', header: 'Type', sort: (b) => b.type, cell: (b) => questionTypeLabel[b.type] },
            { key: 'subject', header: 'Subject', sort: (b) => look.subject(b.subjectId)?.code ?? '', cell: (b) => <span className="text-muted">{look.subject(b.subjectId)?.code ?? '—'}</span> },
            { key: 'topic', header: 'Topic', sort: (b) => b.topic, cell: (b) => <span className="text-muted">{b.topic || '—'}</span> },
            { key: 'difficulty', header: 'Difficulty', sort: (b) => ['easy', 'medium', 'hard'].indexOf(b.difficulty), cell: (b) => <Badge color={diffMeta[b.difficulty].color}>{diffMeta[b.difficulty].label}</Badge> },
            { key: 'points', header: 'Pts', align: 'right', sort: (b) => b.points, cell: (b) => b.points },
            { key: 'used', header: 'Used in', align: 'right', sort: (b) => usage.get(b.id) ?? 0, cell: (b) => `${usage.get(b.id) ?? 0} quiz${usage.get(b.id) === 1 ? '' : 'zes'}` },
            { key: 'status', header: 'Status', sort: (b) => b.status, cell: (b) => <Badge color={b.status === 'active' ? 'var(--success)' : b.status === 'draft' ? 'var(--faint)' : 'var(--muted)'}>{b.status[0].toUpperCase() + b.status.slice(1)}</Badge> },
            { key: 'actions', header: <span className="sr-only">Actions</span>, cell: (b) => <RowMenu label="Question actions" items={[{ label: 'Edit', icon: <PenSquare />, onSelect: () => setEditing(b) }, { label: 'Duplicate', icon: <Copy />, onSelect: () => duplicate(b) }, { label: 'Delete…', icon: <Trash2 />, danger: true, onSelect: () => confirm({ title: 'Delete this question?', body: `It’s removed from the bank. ${usage.get(b.id) ? `The ${usage.get(b.id)} quiz copies keep working — they don’t depend on the bank.` : ''}`, confirmLabel: 'Delete', onConfirm: () => report(toast, actions.deleteBankQuestion(b.id), 'Question deleted') }) }]} /> },
          ]}
        />
      </div>
      <BankForm value={editing} onClose={() => setEditing(null)} />
      {dialog}
    </div>
  )
}
