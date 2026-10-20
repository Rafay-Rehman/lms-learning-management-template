import { useState } from 'react'
import { Link } from 'react-router'
import { BarChart3, Download } from 'lucide-react'
import type { Course } from '@/types'
import { BarList, ColumnChart, Legend, LineChart } from '@/components/charts/Charts'
import { Avatar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { PeriodPicker, usePeriod } from '@/components/ui/PeriodPicker'
import { EmptyState, FilterSelect, Section } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { downloadCsv } from '@/lib/csv'
import { formatMinutes, today } from '@/lib/date'
import { activityTrend, bestAttempts, courseStats, enrollmentTrend, fmtPct, fmtScore, metrics, needsAttention } from '@/services/analytics'
import { useLookup, useStaffBase } from '@/state/selectors'
import { useStore } from '@/state/store'

/** Learning analytics over a set of courses. Every number comes from services/analytics.ts. */
export function AnalyticsView({ courses }: { courses: Course[] }) {
  const { data } = useStore()
  const look = useLookup()
  const base = useStaffBase()
  const t = today()
  const period = usePeriod('90d')
  const [course, setCourse] = useState('')
  const ids = course ? [course] : courses.map((c) => c.id)
  const p = period.period
  const m = metrics(data, t, ids, p)
  const trend = enrollmentTrend(data, p, ids)
  const activity = activityTrend(data, p, { courseIds: ids })
  const scoped = courses.filter((c) => ids.includes(c.id) && c.status !== 'draft')
  const table = scoped.map((c) => ({ c, s: courseStats(data, c, t) })).sort((a, b) => b.s.enrolled - a.s.enrolled)
  const best = bestAttempts(data, ids)
  const quizRates = data.quizzes.filter((q) => ids.includes(q.courseId) && q.status === 'published').map((q) => {
    const b = best.filter((x) => x.quizId === q.id)
    return { key: q.id, label: q.title, value: b.length ? Math.round((b.filter((x) => x.passed).length / b.length) * 100) : 0, n: b.length }
  }).filter((x) => x.n).sort((a, b) => a.value - b.value)
  const attention = needsAttention(data, t, ids)
  const empty = !trend.some((r) => r.enrollments || r.completions) && !activity.some((r) => r.minutes)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodPicker state={period} />
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        <span className="flex-1" />
        <Button icon={<Download />} onClick={() => downloadCsv('course-performance.csv', [['Course', 'Enrolled', 'Active', 'Completed', 'Completion rate', 'Avg progress', 'Avg best score', 'Pass rate', 'Engagement', 'Rating', 'Reviews'], ...table.map(({ c, s }) => [c.title, s.enrolled, s.active, s.completed, fmtPct(s.completionRate), s.avgProgress?.toFixed(0) ?? '', s.avgScore?.toFixed(1) ?? '', fmtPct(s.passRate), fmtPct(s.engagement), s.count ? s.rating.toFixed(2) : '', s.count])])}>Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="New enrollments" value={m.newEnrollments} hint="In this period" />
        <StatCard label="Completions" value={m.completions} hint="In this period" tone="var(--success)" />
        <StatCard label="Learning time" value={formatMinutes(m.minutes)} hint="In this period" tone="var(--highlight)" />
        <StatCard label="Lessons completed" value={m.lessonsCompleted} hint="In this period" tone="var(--secondary)" />
        <StatCard label="Avg. best score" value={fmtScore(m.avgScore)} hint="All time" />
        <StatCard label="Pass rate" value={fmtPct(m.passRate)} hint="All time" tone="var(--success)" />
      </div>
      {empty ? (
        <EmptyState icon={<BarChart3 />} title="No activity in this period" body="Choose a longer date range or another course." className="panel" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Enrollments and completions" action={<Legend series={[{ key: 'e', name: 'Enrollments', color: 'var(--series-1)' }, { key: 'c', name: 'Completions', color: 'var(--series-2)' }]} />}>
            <ColumnChart label="Enrollments and completions" rows={trend} series={[{ key: 'enrollments', name: 'Enrollments', color: 'var(--series-1)' }, { key: 'completions', name: 'Completions', color: 'var(--series-2)' }]} />
          </Section>
          <Section title="Student engagement" action={<Legend series={[{ key: 'l', name: 'Active learners', color: 'var(--series-3)' }, { key: 's', name: 'Lessons completed', color: 'var(--series-4)' }]} />}>
            <LineChart label="Active learners and lessons completed" rows={activity} series={[{ key: 'learners', name: 'Active learners', color: 'var(--series-3)' }, { key: 'lessons', name: 'Lessons completed', color: 'var(--series-4)' }]} />
          </Section>
        </div>
      )}
      <Section title="Course comparison" action={<span className="text-xs text-faint">All time</span>} bodyClassName="px-0 pb-0">
        {table.length ? (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-faint">{['Course', 'Enrolled', 'Completion', 'Avg. progress', 'Avg. score', 'Pass rate', 'Engagement', 'Rating'].map((h, i) => <th key={h} className={`px-4 py-2 font-medium ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {table.map(({ c, s }) => (
                  <tr key={c.id} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-medium"><button className="text-left hover:text-primary" onClick={() => setCourse(c.id)}>{c.title}</button></td>
                    <td className="px-4 py-2.5 text-right tabular">{s.enrolled}</td>
                    <td className="px-4 py-2.5 text-right tabular">{fmtPct(s.completionRate)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{s.avgProgress === null ? '—' : `${Math.round(s.avgProgress)}%`}</td>
                    <td className="px-4 py-2.5 text-right tabular">{fmtScore(s.avgScore)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{fmtPct(s.passRate)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{fmtPct(s.engagement)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{s.count ? s.rating.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<BarChart3 />} title="No published courses in scope" />
        )}
      </Section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Quiz pass rates" action={<span className="text-xs text-faint">Best attempt per student</span>}>
          {quizRates.length ? <BarList items={quizRates.map((q) => ({ ...q, hint: `${q.n} students`, color: q.value < 60 ? 'var(--warning)' : 'var(--success)' }))} format={(v) => `${v}%`} max={100} /> : <p className="text-sm text-muted">No graded attempts yet.</p>}
        </Section>
        <Section title="Students who may need attention" action={<span className="text-xs text-faint">{attention.length}</span>}>
          {attention.length ? (
            <ul className="space-y-3">
              {attention.slice(0, 8).map((a) => {
                const u = look.user(a.userId)!
                return (
                  <li key={a.enrollmentId} className="flex items-start gap-3">
                    <Avatar user={u} size="sm" />
                    <Link to={`${base}/${base === '/admin' ? 'enrollments' : 'students'}?q=${encodeURIComponent(u.name)}&course=${a.courseId}`} className="min-w-0 hover:text-primary">
                      <span className="block text-sm font-medium">{u.name}</span>
                      <span className="block text-xs text-muted">{look.course(a.courseId)?.title} · {a.reasons.join(' · ')}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">No one is flagged right now.</p>
          )}
          <p className="mt-3 text-xs text-faint">Rule-based flags, not predictions: 14+ days without activity, overdue assignments, or a quiz attempted but not yet passed.</p>
        </Section>
      </div>
    </div>
  )
}
