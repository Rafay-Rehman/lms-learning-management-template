import { useState } from 'react'
import { Link } from 'react-router'
import { Award, BookOpen, CalendarClock, CheckCircle2, Clock, Flame, GraduationCap, Sparkles, Target, Trophy } from 'lucide-react'
import { ColumnChart } from '@/components/charts/Charts'
import { CourseArt } from '@/components/courses/CourseArt'
import { LearningCard } from '@/components/courses/CourseCard'
import { Badge, ProgressRing } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { EmptyState, PageHeader, Section, Segmented } from '@/components/ui/misc'
import { StatCard, StatGrid } from '@/components/ui/Stat'
import { useToast } from '@/components/ui/Toast'
import { addDays, dateOf, formatMinutes, relativeDay, today } from '@/lib/date'
import { activityTrend } from '@/services/analytics'
import { achievements, recommendations, studentSummary } from '@/services/student'
import { studentTasks, taskStatusMeta } from '@/services/tasks'
import { useLookup, useMe, useMyEnrollments } from '@/state/selectors'
import { useStore } from '@/state/store'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function GoalCard() {
  const { data, actions } = useStore()
  const me = useMe()
  const toast = useToast()
  const s = studentSummary(data, me.id, today())
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(String(me.weeklyGoalMinutes / 60))
  const goal = me.weeklyGoalMinutes
  const pctDone = goal ? (s.weekMinutes / goal) * 100 : 0
  const save = () => {
    const minutes = Math.round(Number(hours) * 60)
    if (!Number.isFinite(minutes) || minutes < 0) return toast('Enter a number of hours', { tone: 'error' })
    const r = actions.saveUser({ ...me, weeklyGoalMinutes: minutes })
    if (!r.ok) return toast(Object.values(r.errors)[0], { tone: 'error' })
    setEditing(false)
    toast(`Weekly goal set to ${formatMinutes(minutes)}`)
  }
  return (
    <Section title="Weekly learning goal" action={!editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Change goal</Button>}>
      <div className="flex items-center gap-5">
        <ProgressRing value={pctDone} size={96} stroke={8} label="Weekly goal progress">
          <span className="text-center leading-tight"><span className="block text-base">{Math.min(999, Math.round(pctDone))}%</span></span>
        </ProgressRing>
        <div className="min-w-0 text-sm">
          <p><span className="font-semibold">{formatMinutes(s.weekMinutes)}</span> <span className="text-muted">of {goal ? formatMinutes(goal) : 'no goal'} this week</span></p>
          <p className="mt-1 text-muted">{goal === 0 ? 'Set a goal to track your weekly study time.' : pctDone >= 100 ? 'Goal reached — anything more is a bonus.' : `${formatMinutes(Math.max(0, goal - s.weekMinutes))} to go. Weeks start on Monday.`}</p>
        </div>
      </div>
      {editing && (
        <form className="mt-4 flex items-end gap-2" onSubmit={(e) => (e.preventDefault(), save())}>
          <label className="flex-1 text-[13px] font-medium">
            Hours per week
            <Input type="number" min={0} max={50} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1" />
          </label>
          <Button type="submit" variant="primary">Save</Button>
          <Button onClick={() => setEditing(false)}>Cancel</Button>
        </form>
      )}
    </Section>
  )
}

export default function StudentDashboard() {
  const { data, theme } = useStore()
  const me = useMe()
  const look = useLookup()
  const t = today()
  const enrollments = useMyEnrollments()
  const s = studentSummary(data, me.id, t)
  const active = enrollments.filter((e) => e.status === 'active')
  const [range, setRange] = useState<'7' | '30' | '84'>('7')
  const trend = activityTrend(data, { from: addDays(t, -(Number(range) - 1)), to: t }, { userId: me.id })
  const tasks = studentTasks(data, me.id, t).filter((x) => x.status !== 'done')
  const recs = recommendations(data, me.id)
  const wins = achievements(data, me.id).slice(0, 5)
  const w = theme.widgets

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${me.name.split(' ')[0]}`}
        description={active.length ? `You have ${active.length} course${active.length === 1 ? '' : 's'} in progress${tasks.filter((x) => x.status === 'overdue' || x.status === 'due_soon').length ? ` and ${tasks.filter((x) => x.status === 'overdue' || x.status === 'due_soon').length} task(s) due soon` : ''}.` : 'Pick a course to get started.'}
        actions={<ButtonLink to="/learn/explore" icon={<Sparkles />}>Explore courses</ButtonLink>}
      />

      <StatGrid>
        <StatCard label="Enrolled courses" value={s.enrolled} icon={<BookOpen />} to="/learn/history" />
        <StatCard label="In progress" value={s.inProgress} icon={<GraduationCap />} tone="var(--secondary)" />
        <StatCard label="Completed" value={s.completed} icon={<CheckCircle2 />} tone="var(--success)" to="/learn/history" />
        <StatCard label="Learning time" value={formatMinutes(s.minutes)} hint={`${s.lessons} lessons completed`} icon={<Clock />} tone="var(--highlight)" />
        <StatCard label="Certificates" value={s.certificates} icon={<Award />} tone="var(--success)" to="/learn/certificates" />
        <StatCard label="Current streak" value={`${s.streak} day${s.streak === 1 ? '' : 's'}`} hint={s.streak ? 'Study today to keep it going' : 'Study today to start one'} icon={<Flame />} tone="var(--danger)" />
      </StatGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Section title="Continue learning" action={<Link className="text-sm font-medium text-link hover:underline" to="/learn/history">All my courses</Link>}>
            {active.length ? (
              <div className="grid gap-4">{active.slice(0, 3).map((e) => <LearningCard key={e.id} course={e.course} enrollment={e} />)}</div>
            ) : (
              <EmptyState icon={<BookOpen />} title="Nothing in progress" body="Enroll in a course and it will appear here." action={<ButtonLink to="/learn/explore" variant="primary">Browse courses</ButtonLink>} />
            )}
          </Section>

          {w.activity && (
            <Section title="Learning activity" action={<Segmented size="sm" label="Range" value={range} onChange={setRange} options={[{ value: '7', label: 'Week' }, { value: '30', label: 'Month' }, { value: '84', label: '12 weeks' }]} />}>
              {trend.some((r) => r.minutes) ? (
                <ColumnChart label="Minutes studied" rows={trend} series={[{ key: 'minutes', name: 'Minutes studied', color: 'var(--primary)' }]} format={(v) => (v >= 60 ? `${Math.round(v / 6) / 10}h` : `${Math.round(v)}m`)} />
              ) : (
                <EmptyState icon={<Clock />} title="No study time in this period" body="Open a lesson and your activity will be recorded here." />
              )}
              <p className="mt-2 text-xs text-faint">Study time from completed lessons, quizzes, assignments and study sessions.</p>
            </Section>
          )}

          {w.recommended && recs.length > 0 && (
            <Section title="Recommended for you" action={<span className="text-xs text-faint">Based on your courses and interests</span>}>
              <div className="grid gap-4 sm:grid-cols-3">
                {recs.map(({ course, reason }) => (
                  <Link key={course.id} to={`/learn/explore/${course.slug}`} className="group overflow-hidden rounded-[var(--radius)] border border-line hover:border-primary/40">
                    <CourseArt course={course} className="aspect-[2/1]" />
                    <div className="p-3">
                      <p className="font-medium leading-snug group-hover:text-primary">{course.title}</p>
                      <p className="mt-1 text-xs text-muted">{reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {w.goal && <GoalCard />}
          {w.tasks && (
            <Section title="Upcoming tasks" action={<Link className="text-sm font-medium text-link hover:underline" to="/learn/assessments">View all</Link>}>
              {tasks.length ? (
                <ul className="-mx-2 space-y-1">
                  {tasks.slice(0, 6).map((task) => (
                    <li key={task.id}>
                      <Link to={task.link} className="flex items-start gap-3 rounded-[var(--r-ctl)] px-2 py-2 hover:bg-surface-2">
                        <CalendarClock className="mt-0.5 size-4 shrink-0 text-faint" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{task.title}</span>
                          <span className="block truncate text-xs text-muted">{look.course(task.courseId)?.title} · {task.due ? `Due ${relativeDay(task.due).toLowerCase()}` : 'No due date'}</span>
                        </span>
                        <Badge color={taskStatusMeta[task.status].color}>{taskStatusMeta[task.status].label}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<Target />} title="Nothing due" body="Quizzes and assignments from your courses will show up here." className="py-6" />
              )}
            </Section>
          )}
          {w.achievements && (
            <Section title="Recent achievements">
              {wins.length ? (
                <ul className="space-y-3">
                  {wins.map((a) => (
                    <li key={a.id}>
                      <Link to={a.link} className="flex items-start gap-3 hover:text-primary">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success/12 text-success">{a.kind === 'certificate' ? <Award className="size-4" /> : <Trophy className="size-4" />}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{a.title}</span>
                          <span className="block truncate text-xs text-muted">{a.detail} · {relativeDay(dateOf(a.at))}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<Trophy />} title="No achievements yet" body="Complete a course or score 90% on a quiz." className="py-6" />
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
