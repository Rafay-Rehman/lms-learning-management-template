import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, FileQuestion, Plus, Trash2, PenSquare } from 'lucide-react'
import { Badge } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/date'
import { bestAttempts, fmtPct, fmtScore } from '@/services/analytics'
import { report, useLookup, useMe, useStaffBase, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

export function QuizList({ kind, title, description }: { kind?: 'quiz' | 'exam'; title: string; description: string }) {
  const { data, actions } = useStore()
  const me = useMe()
  const look = useLookup()
  const toast = useToast()
  const navigate = useNavigate()
  const base = useStaffBase()
  const [confirm, dialog] = useConfirm()
  const courses = useTeachingCourses()
  const [q, setQ] = useState('')
  const [course, setCourse] = useState('')
  const [status, setStatus] = useState('')
  const [k, setK] = useState(kind ?? '')
  const ids = new Set(courses.map((c) => c.id))
  const route = kind === 'exam' && me.role === 'admin' ? '/admin/exams' : `${base}/quizzes`
  const best = useMemo(() => bestAttempts(data), [data])
  const rows = data.quizzes
    .filter((z) => ids.has(z.courseId) && (!k || z.kind === k) && (!course || z.courseId === course) && (!status || z.status === status) && (!q || z.title.toLowerCase().includes(q.toLowerCase())))
    .map((z) => {
      const b = best.filter((x) => x.quizId === z.id)
      return { ...z, attempts: data.attempts.filter((a) => a.quizId === z.id && a.status !== 'in_progress').length, pending: data.attempts.filter((a) => a.quizId === z.id && a.status === 'pending_review').length, avg: b.length ? b.reduce((s, x) => s + x.percent, 0) / b.length : null, pass: b.length ? b.filter((x) => x.passed).length / b.length : null }
    })
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button icon={<Download />} onClick={() => downloadCsv(`${kind ?? 'quizze'}s.csv`, [['Title', 'Kind', 'Course', 'Status', 'Questions', 'Attempts', 'Average best %', 'Pass rate', 'Due'], ...rows.map((z) => [z.title, z.kind, look.course(z.courseId)?.title, z.status, z.questions.length, z.attempts, z.avg?.toFixed(1) ?? '', z.pass === null ? '' : Math.round(z.pass * 100), z.availableUntil ?? ''])])}>Export CSV</Button>
            <ButtonLink variant="primary" icon={<Plus />} to={`${route}/new${kind ? `?kind=${kind}` : ''}`}>New {kind === 'exam' ? 'exam' : 'quiz'}</ButtonLink>
          </>
        }
      />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search by title" className="w-full sm:w-60" />
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        <FilterSelect label="Status" value={status} onChange={setStatus}><option value="">Draft and published</option><option value="published">Published</option><option value="draft">Draft</option></FilterSelect>
        {!kind && <FilterSelect label="Kind" value={k} onChange={setK}><option value="">Quizzes and exams</option><option value="quiz">Quizzes</option><option value="exam">Exams</option></FilterSelect>}
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label={title}
          rows={rows}
          onRowClick={(z) => navigate(`${route}/${z.id}`)}
          empty={<EmptyState icon={<FileQuestion />} title="Nothing here yet" body="Create a quiz and attach it to a lesson from the course builder." />}
          columns={[
            { key: 'title', header: 'Title', sort: (z) => z.title, cell: (z) => <span><span className="block max-w-72 truncate font-medium">{z.title}</span><span className="block text-xs text-muted">{z.kind === 'exam' ? 'Exam' : 'Quiz'} · {z.questions.length} questions{z.timeLimitMinutes ? ` · ${z.timeLimitMinutes} min` : ''}</span></span> },
            { key: 'course', header: 'Course', sort: (z) => look.course(z.courseId)?.title ?? '', cell: (z) => <span className="block max-w-52 truncate text-muted">{look.course(z.courseId)?.title}</span> },
            { key: 'attempts', header: 'Attempts', align: 'right', sort: (z) => z.attempts, cell: (z) => <>{z.attempts}{z.pending > 0 && <Badge className="ml-2" color="var(--secondary)">{z.pending} to grade</Badge>}</> },
            { key: 'avg', header: 'Avg. best', align: 'right', sort: (z) => z.avg ?? -1, cell: (z) => fmtScore(z.avg) },
            { key: 'pass', header: 'Pass rate', align: 'right', sort: (z) => z.pass ?? -1, cell: (z) => fmtPct(z.pass) },
            { key: 'due', header: 'Due', sort: (z) => z.availableUntil ?? '9', cell: (z) => <span className="text-muted">{z.availableUntil ? formatDate(z.availableUntil) : '—'}</span> },
            { key: 'status', header: 'Status', sort: (z) => z.status, cell: (z) => <Badge color={z.status === 'published' ? 'var(--success)' : 'var(--faint)'}>{z.status === 'published' ? 'Published' : 'Draft'}</Badge> },
            { key: 'actions', header: <span className="sr-only">Actions</span>, cell: (z) => <RowMenu label={`Actions for ${z.title}`} items={[{ label: 'Edit', icon: <PenSquare />, onSelect: () => navigate(`${route}/${z.id}`) }, { label: 'Delete…', icon: <Trash2 />, danger: true, onSelect: () => confirm({ title: `Delete ${z.title}?`, body: z.attempts ? 'Students have attempted this quiz, so it can’t be deleted. Unpublish it to keep their results.' : 'The quiz and its questions are removed. Question bank items aren’t affected.', confirmLabel: 'Delete', onConfirm: () => report(toast, actions.deleteQuiz(z.id), 'Quiz deleted') }) }]} /> },
          ]}
        />
      </div>
      {dialog}
    </div>
  )
}

export default function QuizzesPage() {
  const me = useMe()
  return <QuizList title={me.role === 'admin' ? 'Quiz Management' : 'Quiz Builder'} description="Quizzes and exams across your courses. Results update as students submit." />
}
