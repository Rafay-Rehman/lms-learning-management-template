import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Ban, Check, Download, Eye, PlayCircle, UserPlus, UsersRound, XCircle } from 'lucide-react'
import type { Enrollment, EnrollmentStatus } from '@/types'
import { Avatar, Badge, Progress, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Field, Select } from '@/components/ui/Field'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { formatDate, timeAgo } from '@/lib/date'
import { studentStatus, submissionMeta } from '@/services/assessment'
import { bestAttempt, enrollmentStatusMeta, passed, pct, progressOf } from '@/services/learning'
import { report, useLookup, useMe, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'
import { today } from '@/lib/date'

/** Average of the student's best attempt on each quiz in the course. */
function scoreFor(data: ReturnType<typeof useStore>['data'], e: Enrollment) {
  const xs = data.quizzes.filter((q) => q.courseId === e.courseId).map((q) => bestAttempt(data.attempts, q.id, e.userId)).filter(Boolean).map((a) => pct(a!))
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null
}

function ProgressDetail({ e, onClose }: { e: Enrollment | null; onClose: () => void }) {
  const { data } = useStore()
  const look = useLookup()
  const course = e && look.course(e.courseId)
  const user = e && look.user(e.userId)
  return (
    <Dialog open={!!e} onClose={onClose} variant="drawer" title={user ? `${user.name} · progress` : ''} description={course?.title}>
      {e && course && user && (
        <div className="space-y-6 p-5">
          <div className="flex items-center gap-4">
            <Avatar user={user} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
            <StatusBadge meta={enrollmentStatusMeta[e.status]} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm"><span className="text-muted">Course progress</span><span className="font-semibold tabular">{progressOf(course, e)}%</span></div>
            <Progress value={progressOf(course, e)} label="Course progress" />
            <p className="mt-2 text-xs text-muted">Enrolled {formatDate(e.enrolledAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })} · last active {e.lastActivityAt ? timeAgo(e.lastActivityAt) : 'never'}</p>
          </div>
          <section>
            <h3 className="mb-2 font-sans text-sm font-semibold">Lessons</h3>
            {course.sections.map((s) => (
              <div key={s.id} className="mb-3">
                <p className="text-xs font-medium text-muted">{s.title}</p>
                <ul className="mt-1 space-y-1">
                  {s.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-sm">
                      {e.progress[l.id] ? <Check className="size-4 text-success" aria-label="Completed" /> : <span className="size-4 rounded-full border border-line-strong" aria-label="Not completed" />}
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="text-xs text-faint">{e.progress[l.id] ? formatDate(e.progress[l.id].slice(0, 10)) : l.required ? '' : 'Optional'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          <section>
            <h3 className="mb-2 font-sans text-sm font-semibold">Quizzes</h3>
            <ul className="space-y-1.5 text-sm">
              {data.quizzes.filter((q) => q.courseId === course.id).map((q) => {
                const n = data.attempts.filter((a) => a.quizId === q.id && a.userId === user.id && a.status !== 'in_progress')
                const best = bestAttempt(data.attempts, q.id, user.id)
                return (
                  <li key={q.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{q.title}</span>
                    <span className="text-xs text-muted">{n.length} attempt{n.length === 1 ? '' : 's'}</span>
                    {n.some((a) => a.status === 'pending_review') ? <Badge color="var(--secondary)">Awaiting grading</Badge> : best ? <Badge color={passed(q, best) ? 'var(--success)' : 'var(--danger)'}>{Math.round(pct(best))}%</Badge> : <Badge>Not taken</Badge>}
                  </li>
                )
              })}
            </ul>
          </section>
          <section>
            <h3 className="mb-2 font-sans text-sm font-semibold">Assignments</h3>
            <ul className="space-y-1.5 text-sm">
              {data.assignments.filter((a) => a.courseId === course.id && a.status !== 'draft').map((a) => {
                const sub = data.submissions.find((s) => s.assignmentId === a.id && s.userId === user.id)
                const st = studentStatus(a, sub, today())
                return (
                  <li key={a.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{a.title}</span>
                    {sub?.grade != null && <span className="text-xs tabular">{sub.grade}/{a.maxPoints}</span>}
                    <StatusBadge meta={submissionMeta[st]} />
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}
    </Dialog>
  )
}

export default function EnrollmentsPage() {
  const { data, actions } = useStore()
  const me = useMe()
  const look = useLookup()
  const toast = useToast()
  const [confirm, confirmDialog] = useConfirm()
  const courses = useTeachingCourses()
  const courseIds = new Set(courses.map((c) => c.id))
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const set = (k: string, v: string) => setParams((p) => (v ? p.set(k, v) : p.delete(k), p), { replace: true })
  const [detail, setDetail] = useState<Enrollment | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [form, setForm] = useState({ userId: '', courseId: '' })
  const [error, setError] = useState('')
  const admin = me.role === 'admin'

  const scoped = data.enrollments.filter((e) => courseIds.has(e.courseId))
  const rows = useMemo(() => {
    const term = get('q').toLowerCase()
    return scoped
      .map((e) => ({ ...e, user: look.user(e.userId)!, course: look.course(e.courseId)!, score: scoreFor(data, e) }))
      .filter((e) => e.user && e.course)
      .filter((e) => (!term || e.user.name.toLowerCase().includes(term) || e.user.email.includes(term)) && (!get('course') || e.courseId === get('course')) && (!get('status') || e.status === get('status')) && (!get('subject') || e.course.subjectId === get('subject')) && (!get('term') || e.course.termId === get('term')) && (!get('group') || data.groups.find((g) => g.id === get('group'))?.studentIds.includes(e.userId)))
  }, [scoped, data, look, params]) // eslint-disable-line react-hooks/exhaustive-deps

  const change = (e: Enrollment, status: EnrollmentStatus, verb: string) => report(toast, actions.setEnrollmentStatus(e.id, status), `Enrollment ${verb}`)
  const submit = () => {
    const r = actions.enroll(form.userId, form.courseId)
    if (!r.ok) return setError(Object.values(r.errors)[0])
    toast(`${look.user(form.userId)?.name} enrolled in ${look.course(form.courseId)?.title}`)
    setEnrolling(false)
    setForm({ userId: '', courseId: '' })
    setError('')
  }
  const count = (s: EnrollmentStatus) => scoped.filter((e) => e.status === s).length

  return (
    <div>
      <PageHeader
        title={admin ? 'Enrollments' : 'Student Management'}
        description="Active and completed enrollments count toward totals; suspended and cancelled ones are kept for history but excluded."
        actions={
          <>
            <Button icon={<Download />} onClick={() => downloadCsv('enrollments.csv', [['Student', 'Email', 'Course', 'Status', 'Enrolled', 'Progress %', 'Average quiz %', 'Last activity'], ...rows.map((e) => [e.user.name, e.user.email, e.course.title, e.status, e.enrolledAt.slice(0, 10), progressOf(e.course, e), e.score === null ? '' : e.score.toFixed(1), e.lastActivityAt?.slice(0, 10) ?? ''])])}>Export CSV</Button>
            <Button variant="primary" icon={<UserPlus />} onClick={() => setEnrolling(true)}>Enroll a student</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(['active', 'completed', 'suspended', 'cancelled'] as EnrollmentStatus[]).map((s) => (
          <button key={s} onClick={() => set('status', get('status') === s ? '' : s)} className="text-left" aria-pressed={get('status') === s}>
            <StatCard label={enrollmentStatusMeta[s].label} value={count(s)} hint={enrollmentStatusMeta[s].hint} tone={enrollmentStatusMeta[s].color} />
          </button>
        ))}
      </div>
      <Toolbar>
        <SearchInput value={get('q')} onChange={(v) => set('q', v)} placeholder="Search students" className="w-full sm:w-60" />
        <FilterSelect label="Course" value={get('course')} onChange={(v) => set('course', v)}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        <FilterSelect label="Status" value={get('status')} onChange={(v) => set('status', v)}><option value="">All statuses</option>{(Object.keys(enrollmentStatusMeta) as EnrollmentStatus[]).map((s) => <option key={s} value={s}>{enrollmentStatusMeta[s].label}</option>)}</FilterSelect>
        {admin && data.settings.academic.subjects && <FilterSelect label="Subject" value={get('subject')} onChange={(v) => set('subject', v)}><option value="">All subjects</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</FilterSelect>}
        {admin && data.settings.academic.terms && <FilterSelect label="Term" value={get('term')} onChange={(v) => set('term', v)}><option value="">All terms</option>{data.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</FilterSelect>}
        {admin && <FilterSelect label="Group" value={get('group')} onChange={(v) => set('group', v)}><option value="">All groups</option>{data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</FilterSelect>}
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Enrollments"
          rows={rows}
          initialSort={{ key: 'enrolled', dir: 'desc' }}
          onRowClick={setDetail}
          empty={<EmptyState icon={<UsersRound />} title="No enrollments match" body="Change the filters or enroll a student." />}
          columns={[
            { key: 'student', header: 'Student', sort: (e) => e.user.name, cell: (e) => <span className="flex items-center gap-2.5"><Avatar user={e.user} size="sm" /><span><span className="block font-medium">{e.user.name}</span><span className="block text-xs text-muted">{e.user.email}</span></span></span> },
            { key: 'course', header: 'Course', sort: (e) => e.course.title, cell: (e) => <span className="block max-w-56 truncate text-muted">{e.course.title}</span> },
            { key: 'enrolled', header: 'Enrolled', sort: (e) => e.enrolledAt, cell: (e) => <span className="text-muted">{formatDate(e.enrolledAt.slice(0, 10))}</span> },
            { key: 'progress', header: 'Progress', sort: (e) => progressOf(e.course, e), cell: (e) => <span className="flex w-32 items-center gap-2"><Progress value={progressOf(e.course, e)} label={`${e.user.name} progress`} /><span className="w-9 text-right text-xs tabular">{progressOf(e.course, e)}%</span></span> },
            { key: 'activity', header: 'Last activity', sort: (e) => e.lastActivityAt ?? '', cell: (e) => <span className="text-muted">{e.lastActivityAt ? timeAgo(e.lastActivityAt) : '—'}</span> },
            { key: 'score', header: 'Avg. quiz', align: 'right', sort: (e) => e.score ?? -1, cell: (e) => (e.score === null ? <span className="text-faint">—</span> : `${Math.round(e.score)}%`) },
            { key: 'status', header: 'Status', sort: (e) => e.status, cell: (e) => <StatusBadge meta={enrollmentStatusMeta[e.status]} /> },
            {
              key: 'actions', header: <span className="sr-only">Actions</span>,
              cell: (e) => (
                <RowMenu
                  label={`Actions for ${e.user.name}`}
                  items={[
                    { label: 'View progress', icon: <Eye />, onSelect: () => setDetail(e) },
                    ...(e.status === 'active' ? [{ label: 'Suspend', icon: <Ban />, onSelect: () => confirm({ title: `Suspend ${e.user.name}?`, body: 'They lose access to the course until reactivated. Progress is kept.', confirmLabel: 'Suspend', tone: 'primary' as const, onConfirm: () => change(e, 'suspended', 'suspended') }) }] : []),
                    ...(e.status === 'suspended' || e.status === 'cancelled' ? [{ label: 'Reactivate', icon: <PlayCircle />, onSelect: () => change(e, 'active', 'reactivated') }] : []),
                    ...(e.status === 'active' || e.status === 'suspended' ? [{ label: 'Remove from course…', icon: <XCircle />, danger: true, onSelect: () => confirm({ title: `Remove ${e.user.name} from ${e.course.title}?`, body: 'The enrollment is cancelled. Their progress and grades are kept for the record and the enrollment can be reactivated.', confirmLabel: 'Remove', onConfirm: () => change(e, 'cancelled', 'cancelled') }) }] : []),
                  ]}
                />
              ),
            },
          ]}
        />
      </div>

      <Dialog open={enrolling} onClose={() => (setEnrolling(false), setError(''))} title="Enroll a student" size="sm" footer={<><Button onClick={() => setEnrolling(false)}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!form.userId || !form.courseId}>Enroll</Button></>}>
        <form className="space-y-4 p-5" onSubmit={(e) => (e.preventDefault(), submit())}>
          {error && <p className="rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
          <Field label="Student" required>{(p) => <Select {...p} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}><option value="">Choose a student…</option>{data.users.filter((u) => u.role === 'student').sort((a, b) => a.name.localeCompare(b.name)).map((u) => <option key={u.id} value={u.id} disabled={!u.active}>{u.name}{!u.active ? ' (deactivated)' : ''}</option>)}</Select>}</Field>
          <Field label="Course" required hint="Staff can enroll students in draft courses for testing.">{(p) => <Select {...p} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}><option value="">Choose a course…</option>{courses.filter((c) => c.status !== 'archived').map((c) => <option key={c.id} value={c.id}>{c.title}{c.status !== 'published' ? ` (${c.status})` : ''}</option>)}</Select>}</Field>
        </form>
      </Dialog>
      <ProgressDetail e={detail} onClose={() => setDetail(null)} />
      {confirmDialog}
    </div>
  )
}
