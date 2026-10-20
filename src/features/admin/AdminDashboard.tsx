import { Link } from 'react-router'
import { Activity, BookOpen, CalendarClock, CalendarRange, ClipboardList, GraduationCap, Library, LibraryBig, Upload, Users } from 'lucide-react'
import { BarList, ColumnChart, Legend, LineChart } from '@/components/charts/Charts'
import { Avatar, Badge } from '@/components/ui/Badges'
import { ButtonLink } from '@/components/ui/Button'
import { PageHeader, Section } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { addDays, formatDate, relativeDay, timeAgo, today } from '@/lib/date'
import { buckets, enrollmentTrend, fmtPct, fmtScore, inPeriod, metrics } from '@/services/analytics'
import { courseStatusMeta } from '@/services/courses'
import { counts } from '@/services/learning'
import { useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { subjectStats, subjectStatusMeta } from './SubjectForm'

export default function AdminDashboard() {
  const { data } = useStore()
  const look = useLookup()
  const t = today()
  const m = metrics(data, t)
  const users = (r: string) => data.users.filter((u) => u.role === r)
  const published = data.courses.filter((c) => c.status === 'published')
  const activePeriods = data.academicYears.filter((y) => y.status === 'active').length + data.terms.filter((x) => x.status === 'active').length
  const period = { from: addDays(t, -83), to: t }
  const trend = enrollmentTrend(data, period)
  const assessments = buckets(period).map((b) => ({ label: b.label, attempts: data.attempts.filter((a) => inPeriod(a.submittedAt, b)).length, submissions: data.submissions.filter((s) => inPeriod(s.submittedAt, b)).length }))
  const subjectsByEnrollment = data.subjects.map((s) => ({ s, n: subjectStats(data, s.id).enrollments.length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 6)
  const popular = published.map((c) => ({ c, n: data.enrollments.filter((e) => e.courseId === c.id && counts(e.status)).length })).sort((a, b) => b.n - a.n).slice(0, 5)
  const horizon = addDays(t, 30)
  const deadlines = [
    ...data.terms.flatMap((x) => [{ id: x.id + 's', date: x.start, title: `${x.name} starts`, to: '/admin/terms', kind: 'Term' }, { id: x.id + 'e', date: x.end, title: `${x.name} ends`, to: '/admin/terms', kind: 'Term' }]),
    ...data.quizzes.filter((q) => q.status === 'published' && q.availableUntil).map((q) => ({ id: q.id, date: q.availableUntil!, title: q.title, to: `/admin/quizzes/${q.id}`, kind: q.kind === 'exam' ? 'Exam' : 'Quiz' })),
    ...data.assignments.filter((a) => a.status === 'assigned').map((a) => ({ id: a.id, date: a.dueDate, title: a.title, to: `/admin/assignments/${a.id}`, kind: 'Assignment' })),
  ].filter((d) => d.date >= t && d.date <= horizon).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7)
  const review = data.courses.filter((c) => c.status === 'review')
  const toGrade = data.attempts.filter((a) => a.status === 'pending_review').length + data.submissions.filter((s) => s.status === 'submitted' || s.status === 'late').length

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description={`${data.settings.name} · ${users('student').length + users('instructor').length + users('admin').length} registered users${review.length ? ` · ${review.length} course${review.length > 1 ? 's' : ''} waiting for review` : ''}${toGrade ? ` · ${toGrade} items awaiting grading` : ''}`}
        actions={<><ButtonLink to="/admin/subjects" icon={<Library />}>Subjects</ButtonLink><ButtonLink to="/admin/reports" variant="primary" icon={<ClipboardList />}>Reports & exports</ButtonLink></>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total subjects" value={data.subjects.length} icon={<Library />} to="/admin/subjects" />
        <StatCard label="Active subjects" value={data.subjects.filter((s) => s.status === 'active').length} icon={<LibraryBig />} tone="var(--success)" to="/admin/subjects?status=active" />
        <StatCard label="Total courses" value={data.courses.length} hint={`${data.courses.filter((c) => c.status === 'draft').length} drafts · ${review.length} in review`} icon={<BookOpen />} to="/admin/courses" />
        <StatCard label="Published courses" value={published.length} icon={<Upload />} tone="var(--success)" to="/admin/courses?status=published" />
        <StatCard label="Active academic periods" value={activePeriods} hint={data.terms.find((x) => x.status === 'active')?.name ?? 'No active term'} icon={<CalendarRange />} tone="var(--secondary)" to="/admin/terms" />
        <StatCard label="Students" value={users('student').length} hint={`${m.learners} enrolled in a course`} icon={<GraduationCap />} tone="var(--primary)" to="/admin/students" />
        <StatCard label="Instructors" value={users('instructor').length} icon={<Users />} tone="var(--highlight)" to="/admin/instructors" />
        <StatCard label="Active enrollments" value={m.active} hint={`Completion rate ${fmtPct(m.completionRate)} · avg. score ${fmtScore(m.avgScore)}`} icon={<Activity />} tone="var(--secondary)" to="/admin/enrollments?status=active" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Section title="Enrollment trends" action={<Legend series={[{ key: 'e', name: 'Enrollments', color: 'var(--series-1)' }]} />}>
            <ColumnChart label="Weekly new enrollments, last 12 weeks" rows={trend} series={[{ key: 'enrollments', name: 'Enrollments', color: 'var(--series-1)' }]} />
          </Section>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Course completions" action={<span className="text-xs text-faint">Per week</span>}>
              <LineChart label="Weekly course completions" rows={trend} series={[{ key: 'completions', name: 'Completions', color: 'var(--series-2)' }]} height={180} />
            </Section>
            <Section title="Assessment activity" action={<Legend series={[{ key: 'a', name: 'Quiz attempts', color: 'var(--series-3)' }, { key: 's', name: 'Submissions', color: 'var(--series-4)' }]} />}>
              <ColumnChart label="Quiz attempts and assignment submissions per week" rows={assessments} series={[{ key: 'attempts', name: 'Quiz attempts', color: 'var(--series-3)' }, { key: 'submissions', name: 'Submissions', color: 'var(--series-4)' }]} height={180} />
            </Section>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Subjects with the most enrollments">
              <BarList items={subjectsByEnrollment.map(({ s, n }) => ({ key: s.id, label: <Link to={`/admin/subjects/${s.id}`} className="hover:text-primary">{s.code} · {s.name}</Link>, value: n }))} />
            </Section>
            <Section title="Most popular courses">
              <BarList items={popular.map(({ c, n }) => ({ key: c.id, label: c.title, value: n, color: 'var(--series-2)' }))} />
            </Section>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Recently created subjects" action={<Link to="/admin/subjects" className="text-sm text-link hover:underline">All</Link>}>
              <ul className="space-y-2.5">{[...data.subjects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((s) => <li key={s.id} className="flex items-center gap-2 text-sm"><Link to={`/admin/subjects/${s.id}`} className="min-w-0 flex-1 truncate hover:text-primary"><span className="font-medium">{s.code}</span> {s.name}</Link><Badge color={subjectStatusMeta[s.status].color}>{subjectStatusMeta[s.status].label}</Badge></li>)}</ul>
            </Section>
            <Section title="Recently updated courses" action={<Link to="/admin/courses" className="text-sm text-link hover:underline">All</Link>}>
              <ul className="space-y-2.5">{[...data.courses].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map((c) => <li key={c.id} className="flex items-center gap-2 text-sm"><Link to={`/admin/builder?course=${c.id}`} className="min-w-0 flex-1 truncate hover:text-primary">{c.title}</Link><span className="shrink-0 text-xs text-faint">{timeAgo(c.updatedAt)}</span><Badge color={courseStatusMeta[c.status].color}>{courseStatusMeta[c.status].label}</Badge></li>)}</ul>
            </Section>
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          {review.length > 0 && (
            <Section title="Waiting for review">
              <ul className="space-y-2">{review.map((c) => <li key={c.id}><Link to={`/admin/builder?course=${c.id}&tab=publish`} className="flex items-center gap-2 text-sm hover:text-primary"><span className="flex-1 font-medium">{c.title}</span><span className="text-xs text-muted">{look.user(c.instructorId)?.name}</span></Link></li>)}</ul>
            </Section>
          )}
          <Section title="Upcoming academic deadlines" action={<span className="text-xs text-faint">Next 30 days</span>}>
            {deadlines.length ? (
              <ul className="space-y-2.5">{deadlines.map((d) => <li key={d.id}><Link to={d.to} className="flex items-center gap-3 hover:text-primary"><CalendarClock className="size-4 shrink-0 text-faint" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{d.title}</span><span className="block text-xs text-muted">{d.kind} · {formatDate(d.date)}</span></span><span className="shrink-0 text-xs text-muted">{relativeDay(d.date)}</span></Link></li>)}</ul>
            ) : <p className="text-sm text-muted">Nothing due in the next 30 days.</p>}
          </Section>
          <Section title="Recent registrations">
            <ul className="space-y-2.5">{[...data.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((u) => <li key={u.id}><Link to={`/admin/users/${u.id}`} className="flex items-center gap-3 text-sm hover:text-primary"><Avatar user={u} size="sm" /><span className="flex-1">{u.name}</span><span className="text-xs text-muted">{timeAgo(u.createdAt)}</span></Link></li>)}</ul>
          </Section>
          <Section title="Recent administrative activity" action={<Link to="/admin/activity" className="text-sm text-link hover:underline">All</Link>}>
            <ul className="space-y-3">{data.audit.slice(0, 7).map((a) => { const u = look.user(a.actorId); return <li key={a.id} className="flex items-start gap-3 text-sm">{u && <Avatar user={u} size="xs" className="mt-0.5" />}<span className="min-w-0 flex-1"><Link to={a.link} className="hover:text-primary">{a.message}</Link><span className="block text-xs text-faint">{u?.name} · {timeAgo(a.at)}</span></span></li> })}</ul>
          </Section>
        </div>
      </div>
    </div>
  )
}
