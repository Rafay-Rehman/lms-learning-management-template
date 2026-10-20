import { Donut } from '@/components/charts/Charts'
import { PageHeader, Section } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { today } from '@/lib/date'
import { fmtPct, fmtScore, metrics } from '@/services/analytics'
import { counts } from '@/services/learning'
import { AnalyticsView } from '@/features/instructor/AnalyticsView'
import { useStore } from '@/state/store'

export default function PlatformAnalyticsPage() {
  const { data } = useStore()
  const m = metrics(data, today())
  const role = (r: string) => data.users.filter((u) => u.role === r)
  const activeStudents = new Set(data.enrollments.filter((e) => e.status === 'active').map((e) => e.userId)).size
  const activeInstructors = new Set(data.courses.filter((c) => c.status === 'published').map((c) => c.instructorId)).size
  const byCategory = data.categories.map((c, i) => ({ key: c.id, name: c.name, color: `var(--series-${(i % 7) + 1})`, value: data.enrollments.filter((e) => counts(e.status) && data.courses.find((x) => x.id === e.courseId)?.categoryId === c.id).length }))
  const courseCats = data.categories.map((c, i) => ({ key: c.id, name: c.name, color: `var(--series-${(i % 7) + 1})`, value: data.courses.filter((x) => x.categoryId === c.id && x.status === 'published').length }))
  return (
    <div>
      <PageHeader title="Platform Analytics" description="Platform-wide learning data. Metric definitions are shared with every dashboard: enrolled = active + completed, completion rate = completed ÷ enrolled, scores use each student’s best attempt." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total users" value={data.users.length} to="/admin/students" />
        <StatCard label="Active students" value={activeStudents} hint="With an active enrollment" tone="var(--secondary)" />
        <StatCard label="Active instructors" value={activeInstructors} hint="Teaching a published course" tone="var(--highlight)" />
        <StatCard label="Published courses" value={data.courses.filter((c) => c.status === 'published').length} tone="var(--success)" />
        <StatCard label="Total enrollments" value={m.enrolled} hint={`${m.suspended} suspended excluded`} />
        <StatCard label="Completion rate" value={fmtPct(m.completionRate)} tone="var(--success)" />
        <StatCard label="Avg. assessment score" value={fmtScore(m.avgScore)} tone="var(--primary)" />
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Section title="Enrollments by category"><Donut items={byCategory} label="Enrollments by category" centerLabel="enrollments" /></Section>
        <Section title="Published courses by category"><Donut items={courseCats} label="Courses by category" centerLabel="courses" /></Section>
        <Section title="Users by role"><Donut items={[{ key: 's', name: 'Students', value: role('student').length, color: 'var(--series-1)' }, { key: 'i', name: 'Instructors', value: role('instructor').length, color: 'var(--series-2)' }, { key: 'a', name: 'Administrators', value: role('admin').length, color: 'var(--series-3)' }]} label="Users by role" centerLabel="users" /></Section>
      </div>
      <AnalyticsView courses={data.courses} />
    </div>
  )
}
