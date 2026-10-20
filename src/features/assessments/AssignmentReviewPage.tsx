import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Download, Paperclip, PenSquare } from 'lucide-react'
import type { Submission } from '@/types'
import { NotFound } from '@/app/App'
import { Avatar, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Dialog } from '@/components/ui/Overlay'
import { EmptyState, FilterSelect, PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { RichText } from '@/features/learning/LessonContent'
import { downloadCsv } from '@/lib/csv'
import { formatDate, today } from '@/lib/date'
import { studentStatus, submissionMeta } from '@/services/assessment'
import { canEditCourse } from '@/services/permissions'
import { useLookup, useMe, useStaffBase } from '@/state/selectors'
import { useStore } from '@/state/store'
import { AssignmentForm } from './AssignmentsPage'
import { fileSize } from './StudentAssignmentPage'

export function GradeDialog({ sub, onClose }: { sub: Submission | null; onClose: () => void }) {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const a = sub && data.assignments.find((x) => x.id === sub.assignmentId)
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState<string | null>(null)
  if (sub && loaded !== sub.id) (setLoaded(sub.id), setGrade(sub.grade?.toString() ?? ''), setFeedback(sub.feedback), setErrors({}))
  const go = (ret: boolean) => {
    const r = actions.gradeSubmission(sub!.id, Number(grade), feedback, ret)
    if (!r.ok) return setErrors(r.errors)
    toast(ret ? 'Returned for revision — the student was notified' : 'Grade saved — the student was notified')
    onClose()
  }
  const u = sub && look.user(sub.userId)
  return (
    <Dialog open={!!sub} onClose={onClose} variant="drawer" title={u ? `${u.name}’s submission` : ''} description={a?.title} footer={<><Button onClick={() => go(true)}>Return for revision</Button><Button variant="primary" onClick={() => go(false)}>Save grade</Button></>}>
      {sub && a && (
        <div className="space-y-5 p-5">
          <p className="text-sm text-muted">Submitted {new Date(sub.submittedAt).toLocaleString()} · <StatusBadge meta={submissionMeta[sub.status]} /></p>
          <div className="rounded-[var(--r-ctl)] border border-line bg-surface-2 p-4 text-sm whitespace-pre-line">{sub.text || <span className="text-faint">No written response.</span>}</div>
          {sub.attachments.length > 0 && (
            <div>
              <p className="text-sm font-medium">Attachments</p>
              <ul className="mt-1 space-y-1 text-sm">{sub.attachments.map((f) => <li key={f.name} className="flex items-center gap-2"><Paperclip className="size-4 text-faint" />{f.name}<span className="text-xs text-faint">{fileSize(f.size)}</span></li>)}</ul>
              <p className="mt-1 text-xs text-faint">Demo: only file names were recorded. Connect file storage to download real attachments.</p>
            </div>
          )}
          {errors.form && <p className="text-sm text-danger" role="alert">{errors.form}</p>}
          <Field label={`Grade (out of ${a.maxPoints})`} error={errors.grade}>{(p) => <Input {...p} type="number" min={0} max={a.maxPoints} value={grade} onChange={(e) => setGrade(e.target.value)} className="w-32" />}</Field>
          <Field label="Feedback" error={errors.feedback} hint="Required when returning work for revision.">{(p) => <Textarea {...p} value={feedback} onChange={(e) => setFeedback(e.target.value)} className="min-h-32" />}</Field>
        </div>
      )}
    </Dialog>
  )
}

export default function AssignmentReviewPage() {
  const { id } = useParams()
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const base = useStaffBase()
  const [grading, setGrading] = useState<Submission | null>(null)
  const [editing, setEditing] = useState(false)
  const [filter, setFilter] = useState('')
  const a = data.assignments.find((x) => x.id === id)
  const course = a && look.course(a.courseId)
  if (!a || !course || !canEditCourse(me, course)) return <NotFound />
  const students = data.enrollments.filter((e) => e.courseId === a.courseId && (e.status === 'active' || e.status === 'completed'))
  const rows = students.map((e) => {
    const sub = data.submissions.find((s) => s.assignmentId === a.id && s.userId === e.userId)
    return { e, user: look.user(e.userId)!, sub, status: studentStatus(a, sub, today()) }
  }).filter((r) => !filter || r.status === filter)
  const graded = data.submissions.filter((s) => s.assignmentId === a.id && s.grade !== null)
  const avg = graded.length ? graded.reduce((s, x) => s + x.grade!, 0) / graded.length : null

  return (
    <div>
      <Link to={`${base}/assignments`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Assignments</Link>
      <PageHeader
        title={a.title}
        description={`${course.title} · due ${formatDate(a.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })} · ${a.maxPoints} points${avg !== null ? ` · average ${avg.toFixed(1)}` : ''}`}
        actions={
          <>
            <Button icon={<Download />} onClick={() => downloadCsv(`${a.title.toLowerCase().replace(/\W+/g, '-')}-grades.csv`, [['Student', 'Email', 'Status', 'Submitted', 'Grade', 'Max', 'Feedback'], ...rows.map((r) => [r.user.name, r.user.email, submissionMeta[r.status].label, r.sub?.submittedAt.slice(0, 10) ?? '', r.sub?.grade ?? '', a.maxPoints, r.sub?.feedback ?? ''])])}>Export grades</Button>
            <Button icon={<PenSquare />} onClick={() => setEditing(true)}>Edit assignment</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Section title={`Submissions (${data.submissions.filter((s) => s.assignmentId === a.id).length} of ${students.length})`} action={<FilterSelect label="Status" value={filter} onChange={setFilter}><option value="">Everyone</option>{(['submitted', 'late', 'graded', 'returned', 'assigned', 'overdue'] as const).map((s) => <option key={s} value={s}>{submissionMeta[s].label}</option>)}</FilterSelect>} bodyClassName="px-0 pb-0">
          {rows.length === 0 ? (
            <EmptyState icon={<PenSquare />} title="No students match" />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Avatar user={r.user} size="sm" />
                  <span className="min-w-40 flex-1"><span className="block text-sm font-medium">{r.user.name}</span><span className="block text-xs text-muted">{r.sub ? `Submitted ${formatDate(r.sub.submittedAt.slice(0, 10))}` : 'Not submitted'}</span></span>
                  {r.sub?.grade != null && <span className="text-sm font-medium tabular">{r.sub.grade}/{a.maxPoints}</span>}
                  <StatusBadge meta={submissionMeta[r.status]} />
                  {r.sub && <Button size="sm" variant={r.sub.status === 'submitted' || r.sub.status === 'late' ? 'primary' : 'secondary'} onClick={() => setGrading(r.sub!)}>{r.sub.status === 'graded' ? 'Edit grade' : 'Grade'}</Button>}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Instructions"><RichText text={a.instructions} /></Section>
      </div>
      <GradeDialog sub={grading} onClose={() => setGrading(null)} />
      <AssignmentForm value={editing ? a : null} onClose={() => setEditing(false)} />
    </div>
  )
}
