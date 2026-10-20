import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, PenSquare, Power, Repeat, UserRoundCog } from 'lucide-react'
import { NotFound } from '@/app/App'
import { useDemoSwitcher } from '@/components/layout/DemoSwitcher'
import { Avatar, Badge, Progress, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { Dialog } from '@/components/ui/Overlay'
import { PageHeader, Section } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatMinutes, timeAgo, today } from '@/lib/date'
import { courseStatusMeta } from '@/services/courses'
import { enrollmentStatusMeta, passed, pct, progressOf } from '@/services/learning'
import { roleLabel } from '@/services/permissions'
import { studentSummary } from '@/services/student'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { UserDialog } from './UserForm'

export default function UserDetailPage() {
  const { id } = useParams()
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const switcher = useDemoSwitcher()
  const [editing, setEditing] = useState(false)
  const [reassign, setReassign] = useState(false)
  const [to, setTo] = useState('')
  const u = look.user(id)
  if (!u) return <NotFound />
  const enrollments = data.enrollments.filter((e) => e.userId === u.id)
  const teaching = data.courses.filter((c) => c.instructorId === u.id)
  const attempts = data.attempts.filter((a) => a.userId === u.id && a.status !== 'in_progress').sort((a, b) => b.submittedAt!.localeCompare(a.submittedAt!))
  const s = studentSummary(data, u.id, today())
  const back = { student: '/admin/students', instructor: '/admin/instructors', admin: '/admin/administrators' }[u.role]

  return (
    <div>
      <Link to={back} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />{roleLabel[u.role]}s</Link>
      <PageHeader
        title={<span className="flex items-center gap-4"><Avatar user={u} size="lg" />{u.name}</span>}
        description={<span className="flex flex-wrap items-center gap-2"><Badge color="var(--primary)">{roleLabel[u.role]}</Badge>{u.active ? <Badge color="var(--success)">Active</Badge> : <Badge color="var(--faint)">Deactivated</Badge>}<span>{u.email}</span>{u.title && <span>· {u.title}</span>}</span>}
        actions={
          <>
            <Button icon={<PenSquare />} onClick={() => setEditing(true)}>Edit / change role</Button>
            <Button icon={<Power />} onClick={() => report(toast, actions.saveUser({ ...u, active: !u.active }), `${u.name} ${u.active ? 'deactivated' : 'activated'}`)}>{u.active ? 'Deactivate' : 'Activate'}</Button>
            {u.role === 'instructor' && teaching.length > 0 && <Button icon={<Repeat />} onClick={() => setReassign(true)}>Reassign courses</Button>}
            <Button variant="ghost" icon={<UserRoundCog />} onClick={() => switcher(u.role)}>View as {roleLabel[u.role].toLowerCase()}</Button>
          </>
        }
      />
      {u.role === 'student' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Enrollments" value={s.enrolled} />
            <StatCard label="Completed" value={s.completed} tone="var(--success)" />
            <StatCard label="Learning time" value={formatMinutes(s.minutes)} tone="var(--highlight)" />
            <StatCard label="Certificates" value={s.certificates} tone="var(--success)" />
            <StatCard label="Weekly goal" value={formatMinutes(u.weeklyGoalMinutes)} hint={`${formatMinutes(s.weekMinutes)} this week`} />
          </div>
          <Section title="Enrollments & course activity" bodyClassName="px-0 pb-0">
            <ul className="divide-y divide-line">
              {enrollments.map((e) => { const c = look.course(e.courseId)!; return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-48 flex-1 font-medium">{c.title}</span>
                  <span className="flex w-40 items-center gap-2"><Progress value={progressOf(c, e)} label={`${c.title} progress`} /><span className="text-xs tabular">{progressOf(c, e)}%</span></span>
                  <span className="w-28 text-xs text-muted">{e.lastActivityAt ? `Active ${timeAgo(e.lastActivityAt)}` : 'Not started'}</span>
                  <StatusBadge meta={enrollmentStatusMeta[e.status]} />
                </li>
              ) })}
              {!enrollments.length && <li className="px-5 py-6 text-sm text-muted">No enrollments.</li>}
            </ul>
          </Section>
          <Section title="Assessment results">
            {attempts.length ? <ul className="divide-y divide-line">{attempts.slice(0, 10).map((a) => { const q = look.quiz(a.quizId)!; return <li key={a.id} className="flex items-center gap-3 py-2 text-sm"><span className="flex-1">{q.title}</span><span className="text-xs text-muted">{formatDate(a.submittedAt!.slice(0, 10))}</span><span className="w-20 text-right tabular">{a.status === 'graded' ? `${Math.round(pct(a))}%` : '—'}</span>{a.status === 'pending_review' ? <Badge color="var(--warning)">To grade</Badge> : passed(q, a) ? <Badge color="var(--success)">Pass</Badge> : <Badge color="var(--danger)">Fail</Badge>}</li> })}</ul> : <p className="text-sm text-muted">No attempts yet.</p>}
          </Section>
        </div>
      )}
      {u.role === 'instructor' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Courses taught">
            <ul className="divide-y divide-line">{teaching.map((c) => <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm"><Link to={`/admin/builder?course=${c.id}`} className="flex-1 font-medium hover:text-primary">{c.title}</Link><span className="text-xs text-muted">{data.enrollments.filter((e) => e.courseId === c.id).length} enrollments</span><Badge color={courseStatusMeta[c.status].color}>{courseStatusMeta[c.status].label}</Badge></li>)}</ul>
            {!teaching.length && <p className="text-sm text-muted">No courses.</p>}
          </Section>
          <Section title="Subjects assigned">
            <ul className="space-y-2">{data.subjects.filter((x) => x.instructorIds.includes(u.id)).map((x) => <li key={x.id}><Link to={`/admin/subjects/${x.id}`} className="text-sm hover:text-primary">{x.code} · {x.name}</Link></li>)}</ul>
            <p className="mt-4 text-sm text-muted">{u.bio}</p>
          </Section>
        </div>
      )}
      {u.role === 'admin' && (
        <Section title="Recent administrative activity">
          <ul className="divide-y divide-line">{data.audit.filter((a) => a.actorId === u.id).slice(0, 15).map((a) => <li key={a.id} className="flex items-center gap-3 py-2 text-sm"><Link to={a.link} className="flex-1 hover:text-primary">{a.message}</Link><span className="text-xs text-faint">{timeAgo(a.at)}</span></li>)}</ul>
        </Section>
      )}
      <UserDialog value={editing ? u : null} onClose={() => setEditing(false)} />
      <Dialog open={reassign} onClose={() => setReassign(false)} title={`Reassign ${u.name}’s courses`} size="sm" footer={<><Button onClick={() => setReassign(false)}>Cancel</Button><Button variant="primary" disabled={!to} onClick={() => report(toast, actions.reassignCourses(u.id, to), 'Courses reassigned') && setReassign(false)}>Reassign {teaching.length} courses</Button></>}>
        <div className="p-5"><Field label="New instructor" hint="Enrollments, quizzes and history move with the courses.">{(p) => <Select {...p} value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose…</option>{data.users.filter((x) => x.role === 'instructor' && x.active && x.id !== u.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field></div>
      </Dialog>
    </div>
  )
}
