import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Paperclip, Send, X } from 'lucide-react'
import type { Submission } from '@/types'
import { NotFound } from '@/app/App'
import { StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { formatDate, relativeDay, today } from '@/lib/date'
import { studentStatus, submissionMeta } from '@/services/assessment'
import { useLookup, useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { RichText } from '@/features/learning/LessonContent'

export const fileSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`)

export default function StudentAssignmentPage() {
  const { id } = useParams()
  const { data, actions } = useStore()
  const look = useLookup()
  const me = useMe()
  const toast = useToast()
  const a = data.assignments.find((x) => x.id === id && x.status !== 'draft')
  const sub = data.submissions.find((s) => s.assignmentId === id && s.userId === me.id)
  const [text, setText] = useState(sub?.status === 'returned' ? sub.text : '')
  const [files, setFiles] = useState<Submission['attachments']>(sub?.status === 'returned' ? sub.attachments : [])
  const [error, setError] = useState('')
  if (!a) return <NotFound />
  const course = look.course(a.courseId)!
  const status = studentStatus(a, sub, today())
  const canSubmit = (!sub || sub.status === 'returned') && a.status === 'assigned' && data.enrollments.some((e) => e.userId === me.id && e.courseId === a.courseId && e.status === 'active')
  const lateBlocked = today() > a.dueDate && !(a.allowLate && data.settings.learning.allowLateSubmissions)

  const submit = () => {
    const r = actions.submitAssignment(a.id, { text, attachments: files })
    if (!r.ok) return setError(Object.values(r.errors)[0])
    setError('')
    toast(today() > a.dueDate ? 'Submitted (late)' : 'Assignment submitted')
  }

  return (
    <div className="mx-auto max-w-[920px]">
      <Link to="/learn/assessments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Quizzes & Assessments</Link>
      <PageHeader title={a.title} description={`${course.title} · ${a.maxPoints} points · due ${formatDate(a.dueDate, { weekday: 'short', day: 'numeric', month: 'short' })} (${relativeDay(a.dueDate).toLowerCase()})`} actions={<StatusBadge meta={submissionMeta[status]} />} />
      <div className="grid gap-6">
        <Section title="Instructions">
          <RichText text={a.instructions} />
          <p className="mt-4 text-xs text-muted">{a.allowLate ? 'Late submissions are accepted and marked as late.' : 'Late submissions are not accepted.'}</p>
        </Section>

        {sub && (
          <Section title="Your submission">
            <p className="text-xs text-muted">Submitted {new Date(sub.submittedAt).toLocaleString()} {sub.status === 'late' && '· late'}</p>
            {sub.text && <p className="mt-3 text-sm whitespace-pre-line">{sub.text}</p>}
            {sub.attachments.length > 0 && <ul className="mt-3 space-y-1">{sub.attachments.map((f) => <li key={f.name} className="flex items-center gap-2 text-sm"><Paperclip className="size-4 text-faint" />{f.name} <span className="text-xs text-faint">{fileSize(f.size)}</span></li>)}</ul>}
            {(sub.status === 'graded' || sub.status === 'returned') && (
              <div className="mt-5 rounded-[var(--r-ctl)] border border-line bg-surface-2 p-4">
                {sub.status === 'graded' && <p className="font-display text-2xl font-semibold tabular">{sub.grade} <span className="text-base text-muted">/ {a.maxPoints}</span></p>}
                <p className="mt-1 text-sm font-medium">{sub.status === 'returned' ? 'Returned for revision' : 'Feedback'} from {look.user(course.instructorId)?.name}</p>
                <p className="mt-1 text-sm text-muted">{sub.feedback || 'No written feedback.'}</p>
              </div>
            )}
          </Section>
        )}

        {canSubmit && (
          <Section title={sub?.status === 'returned' ? 'Resubmit your work' : 'Submit your work'}>
            {lateBlocked ? (
              <p className="text-sm text-danger">The due date has passed and this assignment doesn’t accept late work.</p>
            ) : (
              <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), submit())}>
                <Field label="Response" error={error}>
                  {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" maxLength={20000} placeholder="Write your answer, or summarise what your attachments contain." />}
                </Field>
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--r-btn)] border border-line px-3 py-2 text-sm font-medium hover:bg-surface-2">
                    <Paperclip className="size-4" /> Attach files
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const picked = [...(e.target.files ?? [])].map((f) => ({ name: f.name, size: f.size, type: f.type }))
                        setFiles((cur) => [...cur, ...picked].slice(0, 5))
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <p className="mt-1.5 text-xs text-faint">Demo: only each file’s name and size are recorded. The file itself stays on your device — connect file storage (S3, Cloudinary…) to upload real attachments.</p>
                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {files.map((f, i) => (
                        <li key={f.name + i} className="flex items-center gap-2 text-sm">
                          <Paperclip className="size-4 text-faint" />{f.name}<span className="text-xs text-faint">{fileSize(f.size)}</span>
                          <button type="button" aria-label={`Remove ${f.name}`} className="text-faint hover:text-danger" onClick={() => setFiles(files.filter((_, k) => k !== i))}><X className="size-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button type="submit" variant="primary" icon={<Send />}>Submit assignment</Button>
              </form>
            )}
          </Section>
        )}
      </div>
    </div>
  )
}
