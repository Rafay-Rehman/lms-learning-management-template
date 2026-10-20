import { Link } from 'react-router'
import { Activity, AlertTriangle, BookCopy, ClipboardList, FileQuestion, Gauge, Megaphone, Plus, Star, Target, Trophy, Upload, UsersRound } from 'lucide-react'
import { ColumnChart, Legend } from '@/components/charts/Charts'
import { Avatar, Badge, Progress } from '@/components/ui/Badges'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, PageHeader, Section } from '@/components/ui/misc'
import { StatCard, StatGrid } from '@/components/ui/Stat'
import { addDays, formatDate, relativeDay, timeAgo, today } from '@/lib/date'
import { courseStats, enrollmentTrend, fmtPct, fmtScore, metrics, needsAttention } from '@/services/analytics'
import { courseStatusMeta } from '@/services/courses'
import { allLessons } from '@/services/learning'
import { useLookup, useMe, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function InstructorDashboard() {
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const t = today()
  const courses = useTeachingCourses()
  const ids = courses.map((c) => c.id)
  const m = metrics(data, t, ids)
  const trend = enrollmentTrend(data, { from: addDays(t, -83), to: t }, ids)
  const attention = needsAttention(data, t, ids)
  const live = courses.filter((c) => c.status !== 'archived')
  const stats = live.map((c) => ({ c, s: courseStats(data, c, t) })).sort((a, b) => b.s.enrolled - a.s.enrolled)
  const idSet = new Set(ids)
  const activity = data.events.filter((e) => idSet.has(e.courseId) && e.lessonId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7)
  const horizon = addDays(t, 14)
  const upcoming = [
    ...data.quizzes.filter((q) => idSet.has(q.courseId) && q.status === 'published' && q.availableUntil && q.availableUntil >= t && q.availableUntil <= horizon).map((q) => ({ id: q.id, title: q.title, due: q.availableUntil!, courseId: q.courseId, to: `/teach/quizzes/${q.id}`, kind: q.kind === 'exam' ? 'Exam' : 'Quiz' })),
    ...data.assignments.filter((a) => idSet.has(a.courseId) && a.status === 'assigned' && a.dueDate >= t && a.dueDate <= horizon).map((a) => ({ id: a.id, title: a.title, due: a.dueDate, courseId: a.courseId, to: `/teach/assignments/${a.id}`, kind: 'Assignment' })),
  ].sort((a, b) => a.due.localeCompare(b.due))
  const reviews = data.reviews.filter((r) => idSet.has(r.courseId) && r.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
  const toGrade = data.attempts.filter((a) => a.status === 'pending_review' && idSet.has(look.quiz(a.quizId)?.courseId ?? '')).length + data.submissions.filter((s) => (s.status === 'submitted' || s.status === 'late') && idSet.has(data.assignments.find((a) => a.id === s.assignmentId)?.courseId ?? '')).length
  const drafts = courses.filter((c) => c.status === 'draft' || c.status === 'review')

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${me.name.replace(/^(Dr|Prof)\.\s/, '').split(' ')[0]}`}
        description={`${m.active} active learners across ${live.length} courses${toGrade ? ` · ${toGrade} submission${toGrade === 1 ? '' : 's'} to grade` : ''}.`}
        actions={
          <>
            <ButtonLink to="/teach/announcements" icon={<Megaphone />}>Post announcement</ButtonLink>
            <ButtonLink to="/teach/quizzes/new" icon={<FileQuestion />}>New quiz</ButtonLink>
            <ButtonLink to="/teach/builder" variant="primary" icon={<Plus />}>New course</ButtonLink>
          </>
        }
      />
      <StatGrid>
        <StatCard label="Total courses" value={courses.length} icon={<BookCopy />} to="/teach/courses" />
        <StatCard label="Published" value={courses.filter((c) => c.status === 'published').length} hint={`${drafts.length} draft or in review`} icon={<Upload />} tone="var(--success)" to="/teach/courses?status=published" />
        <StatCard label="Enrolled students" value={m.learners} hint={`${m.enrolled} enrollments`} icon={<UsersRound />} tone="var(--secondary)" to="/teach/students" />
        <StatCard label="Completion rate" value={fmtPct(m.completionRate)} hint="Completed ÷ enrolled" icon={<Trophy />} tone="var(--success)" to="/teach/analytics" />
        <StatCard label="Avg. assessment score" value={fmtScore(m.avgScore)} hint={`Pass rate ${fmtPct(m.passRate)}`} icon={<Target />} tone="var(--highlight)" to="/teach/grades" />
        <StatCard label="Engagement" value={fmtPct(m.engagement)} hint="Active learners seen in 14 days" icon={<Gauge />} tone="var(--primary)" to="/teach/analytics" />
      </StatGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Section title="Enrollment trends" action={<Legend series={[{ key: 'enrollments', name: 'New enrollments', color: 'var(--series-1)' }, { key: 'completions', name: 'Completions', color: 'var(--series-2)' }]} />}>
            <ColumnChart label="Weekly enrollments and completions, last 12 weeks" rows={trend} series={[{ key: 'enrollments', name: 'New enrollments', color: 'var(--series-1)' }, { key: 'completions', name: 'Completions', color: 'var(--series-2)' }]} />
          </Section>
          <Section title="Course performance" action={<Link className="text-sm font-medium text-link hover:underline" to="/teach/analytics">Full analytics</Link>} bodyClassName="px-0 pb-0">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-line text-left text-xs text-faint"><th className="px-5 py-2 font-medium">Course</th><th className="px-3 py-2 text-right font-medium">Enrolled</th><th className="px-3 py-2 font-medium">Avg. progress</th><th className="px-3 py-2 text-right font-medium">Completion</th><th className="px-5 py-2 text-right font-medium">Avg. score</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {stats.map(({ c, s }) => (
                    <tr key={c.id} className="hover:bg-surface-2">
                      <td className="px-5 py-2.5"><Link to={`/teach/students?course=${c.id}`} className="font-medium hover:text-primary">{c.title}</Link>{c.status !== 'published' && <Badge className="ml-2" color={courseStatusMeta[c.status].color}>{courseStatusMeta[c.status].label}</Badge>}</td>
                      <td className="px-3 py-2.5 text-right tabular">{s.enrolled}</td>
                      <td className="px-3 py-2.5"><span className="flex w-28 items-center gap-2"><Progress value={s.avgProgress ?? 0} label={`${c.title} average progress`} /><span className="text-xs tabular">{Math.round(s.avgProgress ?? 0)}%</span></span></td>
                      <td className="px-3 py-2.5 text-right tabular">{fmtPct(s.completionRate)}</td>
                      <td className="px-5 py-2.5 text-right tabular">{fmtScore(s.avgScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="Recent student activity">
            {activity.length ? (
              <ul className="space-y-3">
                {activity.map((e) => {
                  const u = look.user(e.userId)
                  const c = look.course(e.courseId)!
                  const l = allLessons(c).find((x) => x.id === e.lessonId)
                  return (
                    <li key={e.id} className="flex items-center gap-3 text-sm">
                      {u && <Avatar user={u} size="sm" />}
                      <span className="min-w-0 flex-1"><span className="font-medium">{u?.name}</span> <span className="text-muted">{e.kind === 'quiz' ? 'passed' : 'completed'}</span> {l?.title} <span className="text-muted">in {c.title}</span></span>
                      <span className="shrink-0 text-xs text-faint">{timeAgo(e.at)}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState icon={<Activity />} title="No recent activity" />
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-6">
          <Section title="Needs attention" action={<span className="text-xs text-faint">{attention.length} learners</span>}>
            {drafts.length > 0 && (
              <ul className="mb-4 space-y-1.5">
                {drafts.map((c) => <li key={c.id}><Link to={`/teach/builder?course=${c.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><BookCopy className="size-4 text-faint" /><span className="flex-1 truncate">{c.title}</span><Badge color={courseStatusMeta[c.status].color}>{courseStatusMeta[c.status].label}</Badge></Link></li>)}
              </ul>
            )}
            {attention.length ? (
              <ul className="space-y-3">
                {attention.slice(0, 6).map((a) => {
                  const u = look.user(a.userId)!
                  return (
                    <li key={a.enrollmentId}>
                      <Link to={`/teach/students?q=${encodeURIComponent(u.name)}&course=${a.courseId}`} className="flex items-start gap-3 hover:text-primary">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                        <span className="min-w-0"><span className="block text-sm font-medium">{u.name} · <span className="font-normal text-muted">{look.course(a.courseId)?.title}</span></span><span className="block text-xs text-muted">{a.reasons.join(' · ')}</span></span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Every active learner has been active in the last two weeks.</p>
            )}
            <p className="mt-3 text-xs text-faint">Flags: 14+ days inactive, overdue assignments, or a quiz attempted but not passed.</p>
          </Section>
          <Section title="Upcoming assessments" action={<span className="text-xs text-faint">Next 14 days</span>}>
            {upcoming.length ? (
              <ul className="space-y-2.5">
                {upcoming.map((u) => (
                  <li key={u.id}>
                    <Link to={u.to} className="flex items-center gap-3 hover:text-primary">
                      <ClipboardList className="size-4 shrink-0 text-faint" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{u.title}</span><span className="block truncate text-xs text-muted">{u.kind} · {look.course(u.courseId)?.title}</span></span>
                      <span className="shrink-0 text-xs text-muted">{relativeDay(u.due)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing due in the next two weeks.</p>
            )}
          </Section>
          <Section title="Recent reviews">
            {reviews.length ? (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <p className="flex items-center gap-2"><span className="inline-flex items-center gap-1 font-semibold"><Star className="size-3.5 fill-highlight text-highlight" />{r.rating}</span><span className="text-muted">{look.course(r.courseId)?.title}</span><span className="ml-auto text-xs text-faint">{formatDate(r.createdAt.slice(0, 10))}</span></p>
                    <p className="mt-1 text-muted">“{r.body}” — {look.user(r.userId)?.name}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No reviews yet.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
