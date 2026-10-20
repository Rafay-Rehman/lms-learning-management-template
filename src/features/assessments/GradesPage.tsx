import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BarChart3, Download } from 'lucide-react'
import type { QuizAttempt, Submission } from '@/types'
import { Avatar, Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Field'
import { Dialog } from '@/components/ui/Overlay'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/date'
import { ASSIGNMENT_PASS, gradeAttempt, needsManual } from '@/services/assessment'
import { passed, pct } from '@/services/learning'
import { useLookup, useMe, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'
import { GradeDialog } from './AssignmentReviewPage'
import { QuestionView } from './QuestionView'

type GradingStatus = 'auto' | 'manual' | 'pending'
const gradingMeta: Record<GradingStatus, { label: string; color: string }> = {
  auto: { label: 'Auto-graded', color: 'var(--secondary)' },
  manual: { label: 'Graded by hand', color: 'var(--success)' },
  pending: { label: 'Awaiting grading', color: 'var(--warning)' },
}

function AttemptGrader({ attempt, onClose }: { attempt: QuizAttempt | null; onClose: () => void }) {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const quiz = attempt && look.quiz(attempt.quizId)
  const [points, setPoints] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState<string | null>(null)
  const [error, setError] = useState('')
  if (attempt && loaded !== attempt.id) (setLoaded(attempt.id), setPoints(Object.fromEntries(Object.entries(attempt.manualPoints).map(([k, v]) => [k, String(v)]))), setError(''))
  const manual = quiz?.questions.filter((q) => needsManual(q) && attempt?.answers[q.id]?.some((x) => x.trim())) ?? []
  const save = () => {
    for (const q of manual) if (points[q.id] === undefined || points[q.id] === '') return setError('Enter points for every written answer.')
    const mp = Object.fromEntries(manual.map((q) => [q.id, Number(points[q.id])]))
    const r = actions.gradeAttempt(attempt!.id, mp)
    if (!r.ok) return setError(Object.values(r.errors)[0])
    toast('Grades saved — the student was notified')
    onClose()
  }
  const preview = quiz && attempt ? gradeAttempt(quiz, attempt.answers, Object.fromEntries(manual.map((q) => [q.id, Number(points[q.id] || 0)]))) : null
  return (
    <Dialog open={!!attempt} onClose={onClose} variant="drawer" title={quiz ? quiz.title : ''} description={attempt ? `${look.user(attempt.userId)?.name} · submitted ${new Date(attempt.submittedAt!).toLocaleString()}` : ''} footer={manual.length ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save grades</Button></> : undefined}>
      {quiz && attempt && (
        <div className="space-y-6 p-5">
          {preview && <p className="text-sm">Score <strong className="tabular">{preview.score}/{preview.maxScore}</strong> ({preview.maxScore ? Math.round((preview.score / preview.maxScore) * 100) : 0}%) · pass mark {quiz.passingScore}% {manual.length > 0 && <span className="text-muted">(updates as you grade)</span>}</p>}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          {quiz.questions.map((q, i) => (
            <div key={q.id} className="border-b border-line pb-5">
              <QuestionView q={q} index={i} answer={attempt.answers[q.id] ?? []} review manualPoints={attempt.manualPoints[q.id]} />
              {manual.includes(q) && (
                <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                  Points awarded
                  <Input type="number" min={0} max={q.points} value={points[q.id] ?? ''} onChange={(e) => setPoints({ ...points, [q.id]: e.target.value })} className="w-20" />
                  <span className="font-normal text-muted">/ {q.points}</span>
                </label>
              )}
            </div>
          ))}
          {data.settings.learning.quizMustPass && <p className="text-xs text-faint">If the attempt passes, the matching quiz lesson is completed for the student automatically.</p>}
        </div>
      )}
    </Dialog>
  )
}

export default function GradesPage() {
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const courses = useTeachingCourses()
  const ids = new Set(courses.map((c) => c.id))
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const set = (k: string, v: string) => setParams((p) => (v ? p.set(k, v) : p.delete(k), p), { replace: true })
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [sub, setSub] = useState<Submission | null>(null)

  const all = useMemo(() => {
    const quizRows = data.attempts.filter((a) => a.status !== 'in_progress').flatMap((a) => {
      const quiz = look.quiz(a.quizId)
      if (!quiz || !ids.has(quiz.courseId)) return []
      const status: GradingStatus = a.status === 'pending_review' ? 'pending' : Object.keys(a.manualPoints).length ? 'manual' : 'auto'
      return [{ id: a.id, kind: quiz.kind, userId: a.userId, courseId: quiz.courseId, title: quiz.title, score: a.status === 'graded' ? a.score : null, max: a.maxScore, percent: a.status === 'graded' ? pct(a) : null, pass: a.status === 'graded' ? passed(quiz, a) : null, at: a.submittedAt!, status, open: () => setAttempt(a) }]
    })
    const subRows = data.submissions.flatMap((s) => {
      const a = data.assignments.find((x) => x.id === s.assignmentId)
      if (!a || !ids.has(a.courseId)) return []
      const percent = s.grade !== null ? (s.grade / a.maxPoints) * 100 : null
      return [{ id: s.id, kind: 'assignment' as const, userId: s.userId, courseId: a.courseId, title: a.title, score: s.grade, max: a.maxPoints, percent, pass: percent === null ? null : percent >= ASSIGNMENT_PASS, at: s.submittedAt, status: (s.status === 'graded' ? 'manual' : s.status === 'returned' ? 'manual' : 'pending') as GradingStatus, open: () => setSub(s) }]
    })
    return [...quizRows, ...subRows].map((r) => ({ ...r, user: look.user(r.userId)!, course: look.course(r.courseId)! })).filter((r) => r.user && r.course)
  }, [data, look]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = all.filter((r) => {
    const term = get('q').toLowerCase()
    return (!term || r.user.name.toLowerCase().includes(term) || r.title.toLowerCase().includes(term)) && (!get('course') || r.courseId === get('course')) && (!get('subject') || r.course.subjectId === get('subject')) && (!get('type') || r.kind === get('type')) && (!get('status') || r.status === get('status'))
  })
  const graded = rows.filter((r) => r.percent !== null)

  return (
    <div>
      <PageHeader
        title={me.role === 'admin' ? 'Grades & Results' : 'Grading'}
        description={`Quiz, exam and assignment results in one place. Quizzes pass at their own pass mark; assignments at ${ASSIGNMENT_PASS}% of their points.`}
        actions={<Button icon={<Download />} onClick={() => downloadCsv('grades.csv', [['Student', 'Email', 'Subject', 'Course', 'Assessment', 'Type', 'Score', 'Max', 'Percent', 'Result', 'Submitted', 'Grading'], ...rows.map((r) => [r.user.name, r.user.email, look.subject(r.course.subjectId)?.code, r.course.title, r.title, r.kind, r.score ?? '', r.max, r.percent === null ? '' : r.percent.toFixed(1), r.pass === null ? '' : r.pass ? 'pass' : 'fail', r.at.slice(0, 10), gradingMeta[r.status].label])])}>Export CSV</Button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <button className="text-left" onClick={() => set('status', get('status') === 'pending' ? '' : 'pending')} aria-pressed={get('status') === 'pending'}><StatCard label="Awaiting grading" value={rows.filter((r) => r.status === 'pending').length} tone="var(--warning)" hint="Select to filter" /></button>
        <StatCard label="Results" value={rows.length} />
        <StatCard label="Average score" value={graded.length ? `${(graded.reduce((s, r) => s + r.percent!, 0) / graded.length).toFixed(1)}%` : '—'} tone="var(--secondary)" />
        <StatCard label="Pass rate" value={graded.length ? `${Math.round((graded.filter((r) => r.pass).length / graded.length) * 100)}%` : '—'} tone="var(--success)" />
      </div>
      <Toolbar>
        <SearchInput value={get('q')} onChange={(v) => set('q', v)} placeholder="Search student or assessment" className="w-full sm:w-64" />
        <FilterSelect label="Course" value={get('course')} onChange={(v) => set('course', v)}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        {data.settings.academic.subjects && <FilterSelect label="Subject" value={get('subject')} onChange={(v) => set('subject', v)}><option value="">All subjects</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</FilterSelect>}
        <FilterSelect label="Type" value={get('type')} onChange={(v) => set('type', v)}><option value="">All types</option><option value="quiz">Quizzes</option><option value="exam">Exams</option><option value="assignment">Assignments</option></FilterSelect>
        <FilterSelect label="Grading" value={get('status')} onChange={(v) => set('status', v)}><option value="">Any grading status</option>{(Object.keys(gradingMeta) as GradingStatus[]).map((s) => <option key={s} value={s}>{gradingMeta[s].label}</option>)}</FilterSelect>
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Results"
          rows={rows}
          pageSize={20}
          initialSort={{ key: 'at', dir: 'desc' }}
          onRowClick={(r) => r.open()}
          empty={<EmptyState icon={<BarChart3 />} title="No results match" />}
          columns={[
            { key: 'student', header: 'Student', sort: (r) => r.user.name, cell: (r) => <span className="flex items-center gap-2"><Avatar user={r.user} size="xs" />{r.user.name}</span> },
            { key: 'assessment', header: 'Assessment', sort: (r) => r.title, cell: (r) => <span><span className="block max-w-60 truncate font-medium">{r.title}</span><span className="block text-xs text-muted">{r.kind === 'assignment' ? 'Assignment' : r.kind === 'exam' ? 'Exam' : 'Quiz'} · {look.subject(r.course.subjectId)?.code ?? '—'} · <span className="inline-block max-w-40 truncate align-bottom">{r.course.title}</span></span></span> },
            { key: 'score', header: 'Score', align: 'right', sort: (r) => r.percent ?? -1, cell: (r) => (r.score === null ? <span className="text-faint">—</span> : <>{r.score}/{r.max} <span className="text-muted">({Math.round(r.percent!)}%)</span></>) },
            { key: 'result', header: 'Result', sort: (r) => (r.pass === null ? 2 : Number(r.pass)), cell: (r) => (r.pass === null ? <span className="text-faint">—</span> : r.pass ? <Badge color="var(--success)">Pass</Badge> : <Badge color="var(--danger)">Fail</Badge>) },
            { key: 'at', header: 'Submitted', sort: (r) => r.at, cell: (r) => <span className="text-muted">{formatDate(r.at.slice(0, 10))}</span> },
            { key: 'status', header: 'Grading', sort: (r) => r.status, cell: (r) => <Badge color={gradingMeta[r.status].color}>{gradingMeta[r.status].label}</Badge> },
          ]}
        />
      </div>
      <AttemptGrader attempt={attempt} onClose={() => setAttempt(null)} />
      <GradeDialog sub={sub} onClose={() => setSub(null)} />
    </div>
  )
}
