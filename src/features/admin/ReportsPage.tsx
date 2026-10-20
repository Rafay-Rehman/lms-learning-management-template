import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PeriodPicker, usePeriod } from '@/components/ui/PeriodPicker'
import { PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { today } from '@/lib/date'
import { ASSIGNMENT_PASS } from '@/services/assessment'
import { courseStats, fmtPct, inPeriod } from '@/services/analytics'
import { passed, pct, progressOf } from '@/services/learning'
import { studentSummary } from '@/services/student'
import { useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { subjectStats } from './SubjectForm'

type Row = (string | number | null | undefined)[]

export default function ReportsPage() {
  const { data } = useStore()
  const look = useLookup()
  const toast = useToast()
  const period = usePeriod('90d')
  const p = period.period
  const t = today()
  const reports: { id: string; title: string; body: string; dated: boolean; rows: () => Row[] }[] = [
    { id: 'enrollments', title: 'Enrollments', body: 'Every enrollment started in the period, with status and progress.', dated: true, rows: () => [['Student', 'Email', 'Course', 'Subject', 'Status', 'Enrolled', 'Completed', 'Progress %'], ...data.enrollments.filter((e) => inPeriod(e.enrolledAt, p)).map((e) => { const c = look.course(e.courseId)!; return [look.user(e.userId)?.name, look.user(e.userId)?.email, c.title, look.subject(c.subjectId)?.code, e.status, e.enrolledAt.slice(0, 10), e.completedAt?.slice(0, 10), progressOf(c, e)] })] },
    { id: 'courses', title: 'Course performance', body: 'Enrollment, completion, scores, engagement and rating per course (all time).', dated: false, rows: () => [['Course', 'Status', 'Instructor', 'Enrolled', 'Completed', 'Completion rate', 'Avg best score', 'Pass rate', 'Engagement', 'Rating'], ...data.courses.map((c) => { const s = courseStats(data, c, t); return [c.title, c.status, look.user(c.instructorId)?.name, s.enrolled, s.completed, fmtPct(s.completionRate), s.avgScore?.toFixed(1), fmtPct(s.passRate), fmtPct(s.engagement), s.count ? s.rating.toFixed(2) : ''] })] },
    { id: 'students', title: 'Student progress', body: 'One row per student: enrollments, completions, learning time and certificates.', dated: false, rows: () => [['Student', 'Email', 'Active', 'Enrolled', 'In progress', 'Completed', 'Learning minutes', 'Lessons completed', 'Certificates'], ...data.users.filter((u) => u.role === 'student').map((u) => { const s = studentSummary(data, u.id, t); return [u.name, u.email, u.active ? 'yes' : 'no', s.enrolled, s.inProgress, s.completed, s.minutes, s.lessons, s.certificates] })] },
    { id: 'grades', title: 'Grades & results', body: 'Quiz attempts and graded assignments submitted in the period.', dated: true, rows: () => [['Student', 'Course', 'Assessment', 'Type', 'Score', 'Max', 'Percent', 'Result', 'Submitted'], ...data.attempts.filter((a) => a.status !== 'in_progress' && inPeriod(a.submittedAt, p)).map((a) => { const q = look.quiz(a.quizId)!; return [look.user(a.userId)?.name, look.course(q.courseId)?.title, q.title, q.kind, a.status === 'graded' ? a.score : '', a.maxScore, a.status === 'graded' ? pct(a).toFixed(1) : '', a.status === 'graded' ? (passed(q, a) ? 'pass' : 'fail') : 'pending', a.submittedAt!.slice(0, 10)] }), ...data.submissions.filter((s) => inPeriod(s.submittedAt, p)).map((s) => { const a = data.assignments.find((x) => x.id === s.assignmentId)!; return [look.user(s.userId)?.name, look.course(a.courseId)?.title, a.title, 'assignment', s.grade ?? '', a.maxPoints, s.grade === null ? '' : ((s.grade / a.maxPoints) * 100).toFixed(1), s.grade === null ? 'pending' : (s.grade / a.maxPoints) * 100 >= ASSIGNMENT_PASS ? 'pass' : 'fail', s.submittedAt.slice(0, 10)] })] },
    { id: 'certificates', title: 'Certificates', body: 'Certificates issued in the period, including revoked ones.', dated: true, rows: () => [['Code', 'Student', 'Course', 'Issued', 'Status', 'Reason'], ...data.certificates.filter((c) => inPeriod(c.issuedAt, p)).map((c) => [c.code, c.studentName, c.courseTitle, c.issuedAt.slice(0, 10), c.status, c.revokedReason])] },
    { id: 'subjects', title: 'Subjects', body: 'Subjects with their courses, lessons and student totals.', dated: false, rows: () => [['Code', 'Subject', 'Status', 'Department', 'Courses', 'Lessons', 'Students', 'Completed enrollments'], ...data.subjects.map((s) => { const st = subjectStats(data, s.id); return [s.code, s.name, s.status, look.department(s.departmentId)?.name, st.courses.length, st.lessons, st.students, st.completed] })] },
    { id: 'activity', title: 'Learning activity', body: 'Study sessions, lesson completions, quizzes and submissions in the period.', dated: true, rows: () => [['When', 'Student', 'Course', 'Kind', 'Minutes'], ...data.events.filter((e) => inPeriod(e.at, p)).map((e) => [e.at, look.user(e.userId)?.name, look.course(e.courseId)?.title, e.kind, e.minutes])] },
    { id: 'users', title: 'Users', body: 'All accounts with role and status. Contains personal data — handle exports accordingly.', dated: false, rows: () => [['Name', 'Email', 'Role', 'Active', 'Joined'], ...data.users.map((u) => [u.name, u.email, u.role, u.active ? 'yes' : 'no', u.createdAt.slice(0, 10)])] },
  ]
  return (
    <div>
      <PageHeader title="Reports & Exports" description="CSV exports built from the same data and metric definitions as the dashboards. Cells that look like formulas are escaped so spreadsheets don’t execute them." actions={<PeriodPicker state={period} />} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <article key={r.id} className="panel flex flex-col p-5">
            <FileSpreadsheet className="size-6 text-primary" />
            <h2 className="mt-3 font-sans text-base font-semibold">{r.title}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{r.body}</p>
            <p className="mt-2 text-xs text-faint">{r.dated ? `${p.from} to ${p.to}` : 'All time'}</p>
            <Button className="mt-4 self-start" icon={<Download />} onClick={() => { const rows = r.rows(); downloadCsv(`${r.id}-${t}.csv`, rows); toast(`${r.title}: ${rows.length - 1} rows exported`) }}>Download CSV</Button>
          </article>
        ))}
      </div>
    </div>
  )
}
