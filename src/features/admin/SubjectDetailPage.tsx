import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Archive, ArchiveRestore, ArrowLeft, BookOpen, ExternalLink, PenSquare, Plus, Trash2, UserMinus, X } from 'lucide-react'
import type { Subject } from '@/types'
import { NotFound } from '@/app/App'
import { ColumnChart, Legend } from '@/components/charts/Charts'
import { CourseArt } from '@/components/courses/CourseArt'
import { Avatar, Badge, LevelTag, Progress, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { iconFor } from '@/components/ui/icons'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { EmptyState, PageHeader, Section, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { useToast } from '@/components/ui/Toast'
import { addDays, formatDate, timeAgo, today } from '@/lib/date'
import { enrollmentTrend, fmtPct, fmtScore, metrics } from '@/services/analytics'
import { courseStatusMeta, isSafeUrl } from '@/services/courses'
import { allLessons, enrollmentStatusMeta, progressOf } from '@/services/learning'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { SubjectDialog, SubjectFields, subjectStats, subjectStatusMeta } from './SubjectForm'

type Tab = 'overview' | 'courses' | 'instructors' | 'students' | 'resources' | 'assessments' | 'analytics' | 'settings'

function SettingsTab({ s }: { s: Subject }) {
  const { data, actions } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, dialog] = useConfirm()
  const [draft, setDraft] = useState(s)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [target, setTarget] = useState('')
  const stats = subjectStats(data, s.id)
  const bank = data.bank.filter((b) => b.subjectId === s.id).length
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Section title="Subject details">
        <form onSubmit={(e) => { e.preventDefault(); const r = actions.saveSubject(draft); r.ok ? (setErrors({}), toast('Subject saved')) : setErrors(r.errors) }} noValidate>
          <SubjectFields s={draft} set={(p) => setDraft({ ...draft, ...p })} errors={errors} />
          <div className="mt-5 flex gap-2"><Button type="submit" variant="primary">Save changes</Button><Button onClick={() => (setDraft(s), setErrors({}))}>Discard</Button></div>
        </form>
      </Section>
      <div className="space-y-6">
        <Section title="Archive">
          <p className="text-sm text-muted">Archived subjects disappear from pickers but keep their courses, enrollments, grades and certificates.</p>
          <div className="mt-3">
            {s.status === 'archived'
              ? <Button icon={<ArchiveRestore />} onClick={() => report(toast, actions.setSubjectStatus([s.id], 'active'), 'Subject restored') && setDraft({ ...draft, status: 'active' })}>Restore subject</Button>
              : <Button icon={<Archive />} onClick={() => confirm({ title: `Archive ${s.name}?`, body: `${stats.courses.length} courses stay linked and keep running; their history is untouched.`, confirmLabel: 'Archive subject', tone: 'primary', onConfirm: () => report(toast, actions.setSubjectStatus([s.id], 'archived'), 'Subject archived') && setDraft({ ...draft, status: 'archived' }) })}>Archive subject</Button>}
          </div>
        </Section>
        <Section title="Move courses">
          <p className="text-sm text-muted">Reassign this subject’s {stats.courses.length} course{stats.courses.length === 1 ? '' : 's'} and {bank} bank question{bank === 1 ? '' : 's'} to another subject — for example before deleting it.</p>
          <div className="mt-3 flex gap-2">
            <Select aria-label="Target subject" value={target} onChange={(e) => setTarget(e.target.value)} className="flex-1"><option value="">Choose a subject…</option><option value="__none">No subject</option>{data.subjects.filter((x) => x.id !== s.id && x.status !== 'archived').map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</Select>
            <Button disabled={!target || !stats.courses.length && !bank} onClick={() => report(toast, actions.reassignSubjectCourses(s.id, target === '__none' ? null : target), 'Courses moved')}>Move</Button>
          </div>
        </Section>
        <Section title="Delete">
          <p className="text-sm text-muted">{stats.courses.length || bank ? 'This subject still has courses or questions, so it can’t be deleted. Move them first, or archive it.' : 'Nothing uses this subject. Deleting it is permanent.'}</p>
          <Button className="mt-3" variant="danger" icon={<Trash2 />} disabled={!!(stats.courses.length || bank)} onClick={() => confirm({ title: `Delete ${s.name}?`, body: 'This can’t be undone.', confirmLabel: 'Delete subject', onConfirm: () => report(toast, actions.deleteSubjects([s.id]), 'Subject deleted') && navigate('/admin/subjects') })}>Delete subject</Button>
        </Section>
      </div>
      {dialog}
    </div>
  )
}

export default function SubjectDetailPage() {
  const { id } = useParams()
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState<'course' | 'instructor' | null>(null)
  const [pick, setPick] = useState('')
  const s = data.subjects.find((x) => x.id === id)
  if (!s) return <NotFound />
  const t = today()
  const stats = subjectStats(data, s.id)
  const ids = stats.courses.map((c) => c.id)
  const m = metrics(data, t, ids)
  const Icon = iconFor(s.icon)
  const quizzes = data.quizzes.filter((q) => ids.includes(q.courseId))
  const assignments = data.assignments.filter((a) => ids.includes(a.courseId))
  const resources = stats.courses.flatMap((c) => allLessons(c).flatMap((l) => [...(l.type === 'pdf' || l.type === 'link' ? [{ id: l.id, title: l.title, url: l.url, course: c.title }] : []), ...l.resources.map((r) => ({ id: r.id, title: r.title, url: r.url, course: c.title }))]))
  const recent = data.events.filter((e) => ids.includes(e.courseId) && e.lessonId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
  const trend = enrollmentTrend(data, { from: addDays(t, -179), to: t }, ids)

  const assignCourse = () => {
    const c = look.course(pick)!
    if (report(toast, actions.saveCourse({ ...c, subjectId: s.id }), `${c.title} now belongs to ${s.code}`)) (setAdding(null), setPick(''))
  }
  const assignInstructor = () => {
    if (report(toast, actions.saveSubject({ ...s, instructorIds: [...s.instructorIds, pick] }), `${look.user(pick)?.name} assigned`)) (setAdding(null), setPick(''))
  }

  return (
    <div>
      <Link to="/admin/subjects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Subjects</Link>
      <PageHeader
        title={<span className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-primary-soft text-primary"><Icon className="size-5" /></span>{s.name}</span>}
        description={<span className="flex flex-wrap items-center gap-2"><span className="font-medium text-ink">{s.code}</span><StatusBadge meta={subjectStatusMeta[s.status]} /><LevelTag level={s.level} />{look.department(s.departmentId) && <span>{look.department(s.departmentId)!.name}</span>}{s.yearId && <span>· {look.year(s.yearId)?.name}{s.termId && `, ${look.term(s.termId)?.name}`}</span>}</span>}
        actions={<Button icon={<PenSquare />} onClick={() => setEditing(true)}>Edit subject</Button>}
      />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'overview', label: 'Overview' }, { value: 'courses', label: 'Courses', count: stats.courses.length }, { value: 'instructors', label: 'Instructors', count: s.instructorIds.length },
        { value: 'students', label: 'Students', count: stats.students }, { value: 'resources', label: 'Learning Resources', count: resources.length }, { value: 'assessments', label: 'Assessments', count: quizzes.length + assignments.length },
        { value: 'analytics', label: 'Analytics' }, { value: 'settings', label: 'Settings' },
      ]} />
      <div className="pt-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Courses" value={stats.courses.length} hint={`${stats.courses.filter((c) => c.status === 'published').length} published`} />
              <StatCard label="Lessons" value={stats.lessons} />
              <StatCard label="Students" value={stats.students} hint={`${stats.enrollments.length} enrollments`} tone="var(--secondary)" />
              <StatCard label="Active enrollments" value={m.active} tone="var(--primary)" />
              <StatCard label="Completion rate" value={fmtPct(m.completionRate)} tone="var(--success)" />
              <StatCard label="Avg. score" value={fmtScore(m.avgScore)} tone="var(--highlight)" />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Section title="About">
                <p className="text-sm leading-relaxed">{s.description || s.shortDescription || 'No description yet.'}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-faint">Category</dt><dd>{data.subjectCategories.find((c) => c.id === s.categoryId)?.name ?? '—'}</dd></div>
                  <div><dt className="text-faint">Created</dt><dd>{formatDate(s.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                  <div><dt className="text-faint">Last updated</dt><dd>{formatDate(s.updatedAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                </dl>
                <h3 className="mt-5 mb-2 font-sans text-sm font-semibold">Courses</h3>
                <ul className="space-y-1.5">{stats.courses.map((c) => <li key={c.id} className="flex items-center gap-2 text-sm"><BookOpen className="size-4 text-faint" /><Link to={`/admin/builder?course=${c.id}`} className="flex-1 hover:text-primary">{c.title}</Link><Badge color={courseStatusMeta[c.status].color}>{courseStatusMeta[c.status].label}</Badge></li>)}</ul>
                {!stats.courses.length && <p className="text-sm text-muted">No courses yet.</p>}
              </Section>
              <Section title="Recent activity">
                {recent.length ? (
                  <ul className="space-y-3">{recent.map((e) => { const u = look.user(e.userId); const c = look.course(e.courseId)!; return <li key={e.id} className="flex items-center gap-2.5 text-sm">{u && <Avatar user={u} size="xs" />}<span className="min-w-0 flex-1 truncate"><span className="font-medium">{u?.name}</span> <span className="text-muted">completed {allLessons(c).find((l) => l.id === e.lessonId)?.title}</span></span><span className="shrink-0 text-xs text-faint">{timeAgo(e.at)}</span></li> })}</ul>
                ) : <p className="text-sm text-muted">No learning activity yet.</p>}
              </Section>
            </div>
          </div>
        )}
        {tab === 'courses' && (
          <Section title="Courses in this subject" action={<Button size="sm" icon={<Plus />} onClick={() => (setAdding('course'), setPick(''))}>Associate a course</Button>}>
            {stats.courses.length ? (
              <ul className="divide-y divide-line">
                {stats.courses.map((c) => {
                  const enrolled = stats.enrollments.filter((e) => e.courseId === c.id).length
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                      <CourseArt course={c} className="aspect-[4/3] w-16 shrink-0 rounded-md" showIcon={false} />
                      <span className="min-w-48 flex-1"><Link to={`/admin/builder?course=${c.id}`} className="block font-medium hover:text-primary">{c.title}</Link><span className="block text-xs text-muted">{look.user(c.instructorId)?.name} · {enrolled} enrolled · {look.term(c.termId)?.name ?? 'Self-paced'}</span></span>
                      <Badge color={courseStatusMeta[c.status].color}>{courseStatusMeta[c.status].label}</Badge>
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${c.title} from subject`} icon={<X />} onClick={() => report(toast, actions.saveCourse({ ...c, subjectId: null }), `${c.title} removed from ${s.code}`)} />
                    </li>
                  )
                })}
              </ul>
            ) : <EmptyState icon={<BookOpen />} title="No courses yet" body="Associate an existing course, or set the subject in the course builder." />}
          </Section>
        )}
        {tab === 'instructors' && (
          <Section title="Assigned instructors" action={<Button size="sm" icon={<Plus />} onClick={() => (setAdding('instructor'), setPick(''))}>Assign instructor</Button>}>
            {s.instructorIds.length ? (
              <ul className="divide-y divide-line">
                {s.instructorIds.map((iid) => { const u = look.user(iid); if (!u) return null; const teaching = stats.courses.filter((c) => c.instructorId === u.id); return (
                  <li key={iid} className="flex items-center gap-3 py-3">
                    <Avatar user={u} />
                    <span className="flex-1"><Link to={`/admin/users/${u.id}`} className="block font-medium hover:text-primary">{u.name}</Link><span className="block text-xs text-muted">{u.title} · teaches {teaching.length} course{teaching.length === 1 ? '' : 's'} here</span></span>
                    <Button size="sm" variant="ghost" icon={<UserMinus />} onClick={() => report(toast, actions.saveSubject({ ...s, instructorIds: s.instructorIds.filter((x) => x !== iid) }), `${u.name} unassigned`)}>Unassign</Button>
                  </li>
                ) })}
              </ul>
            ) : <p className="text-sm text-muted">No instructors assigned.</p>}
          </Section>
        )}
        {tab === 'students' && (
          <Section title="Students" bodyClassName="px-0 pb-0">
            {stats.enrollments.length ? (
              <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-line text-left text-xs text-faint"><th className="px-5 py-2 font-medium">Student</th><th className="px-5 py-2 font-medium">Course</th><th className="px-5 py-2 font-medium">Progress</th><th className="px-5 py-2 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-line">{stats.enrollments.map((e) => { const u = look.user(e.userId)!; const c = look.course(e.courseId)!; return (
                  <tr key={e.id}><td className="px-5 py-2.5"><Link to={`/admin/users/${u.id}`} className="flex items-center gap-2 hover:text-primary"><Avatar user={u} size="xs" />{u.name}</Link></td><td className="px-5 py-2.5 text-muted">{c.title}</td><td className="px-5 py-2.5"><span className="flex w-36 items-center gap-2"><Progress value={progressOf(c, e)} label={`${u.name} progress`} /><span className="text-xs tabular">{progressOf(c, e)}%</span></span></td><td className="px-5 py-2.5"><StatusBadge meta={enrollmentStatusMeta[e.status]} /></td></tr>
                ) })}</tbody>
              </table></div>
            ) : <EmptyState icon={<BookOpen />} title="No students yet" />}
          </Section>
        )}
        {tab === 'resources' && (
          <Section title="Learning resources">
            {resources.length ? <ul className="divide-y divide-line">{resources.map((r) => <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm"><span className="flex-1"><span className="block font-medium">{r.title}</span><span className="block text-xs text-muted">{r.course}</span></span>{isSafeUrl(r.url) && <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link hover:underline"><ExternalLink className="size-3.5" />Open</a>}</li>)}</ul> : <p className="text-sm text-muted">No resources yet. Add them to lessons in the course builder.</p>}
          </Section>
        )}
        {tab === 'assessments' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Quizzes & exams">{quizzes.length ? <ul className="divide-y divide-line">{quizzes.map((q) => <li key={q.id} className="flex items-center gap-2 py-2.5 text-sm"><Link to={`/admin/quizzes/${q.id}`} className="flex-1 font-medium hover:text-primary">{q.title}</Link><span className="text-xs text-muted">{data.attempts.filter((a) => a.quizId === q.id && a.status !== 'in_progress').length} attempts</span><Badge color={q.status === 'published' ? 'var(--success)' : 'var(--faint)'}>{q.status === 'published' ? 'Published' : 'Draft'}</Badge></li>)}</ul> : <p className="text-sm text-muted">No quizzes.</p>}</Section>
            <Section title="Assignments">{assignments.length ? <ul className="divide-y divide-line">{assignments.map((a) => <li key={a.id} className="flex items-center gap-2 py-2.5 text-sm"><Link to={`/admin/assignments/${a.id}`} className="flex-1 font-medium hover:text-primary">{a.title}</Link><span className="text-xs text-muted">due {formatDate(a.dueDate)}</span></li>)}</ul> : <p className="text-sm text-muted">No assignments.</p>}
              <p className="mt-4 text-sm text-muted"><Link className="link" to={`/admin/question-bank`}>{data.bank.filter((b) => b.subjectId === s.id).length} question-bank items</Link> are tagged with this subject.</p>
            </Section>
          </div>
        )}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Enrolled" value={m.enrolled} hint="Active + completed" />
              <StatCard label="Completion rate" value={fmtPct(m.completionRate)} tone="var(--success)" />
              <StatCard label="Pass rate" value={fmtPct(m.passRate)} tone="var(--secondary)" />
              <StatCard label="Engagement" value={fmtPct(m.engagement)} hint="Active in 14 days" />
            </div>
            <Section title="Enrollments and completions, last 6 months" action={<Legend series={[{ key: 'e', name: 'Enrollments', color: 'var(--series-1)' }, { key: 'c', name: 'Completions', color: 'var(--series-2)' }]} />}>
              <ColumnChart label="Subject enrollments and completions" rows={trend} series={[{ key: 'enrollments', name: 'Enrollments', color: 'var(--series-1)' }, { key: 'completions', name: 'Completions', color: 'var(--series-2)' }]} />
            </Section>
            <p className="text-xs text-faint">Same definitions as Platform Analytics, scoped to this subject’s courses.</p>
          </div>
        )}
        {tab === 'settings' && <SettingsTab key={s.updatedAt} s={s} />}
      </div>

      <SubjectDialog value={editing ? s : null} onClose={() => setEditing(false)} />
      <Dialog open={!!adding} onClose={() => setAdding(null)} title={adding === 'course' ? 'Associate a course' : 'Assign an instructor'} size="sm" footer={<><Button onClick={() => setAdding(null)}>Cancel</Button><Button variant="primary" disabled={!pick} onClick={adding === 'course' ? assignCourse : assignInstructor}>{adding === 'course' ? 'Associate' : 'Assign'}</Button></>}>
        <div className="p-5">
          {adding === 'course' ? (
            <Field label="Course" hint="Moving a course here removes it from its current subject.">{(p) => <Select {...p} value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Choose a course…</option>{data.courses.filter((c) => c.subjectId !== s.id).map((c) => <option key={c.id} value={c.id}>{c.title}{c.subjectId ? ` (now ${look.subject(c.subjectId)?.code})` : ''}</option>)}</Select>}</Field>
          ) : (
            <Field label="Instructor">{(p) => <Select {...p} value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Choose an instructor…</option>{data.users.filter((u) => u.role === 'instructor' && u.active && !s.instructorIds.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}</Field>
          )}
        </div>
      </Dialog>
    </div>
  )
}
