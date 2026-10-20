import { useState } from 'react'
import { Link } from 'react-router'
import { ClipboardCheck, FileText, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/Badges'
import { EmptyState, PageHeader, Section, Tabs } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { formatDate, relativeDay, today } from '@/lib/date'
import { bestAttempts, fmtPct, fmtScore } from '@/services/analytics'
import { passed, pct } from '@/services/learning'
import { studentTasks, taskStatusMeta } from '@/services/tasks'
import { useLookup, useMe } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function AssessmentsPage() {
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const [tab, setTab] = useState<'todo' | 'done' | 'all'>('todo')
  const tasks = studentTasks(data, me.id, today())
  const shown = tasks.filter((t) => (tab === 'all' ? true : tab === 'done' ? t.status === 'done' || t.status === 'pending' : t.status !== 'done' && t.status !== 'pending'))
  const best = bestAttempts(data).filter((b) => b.userId === me.id)
  const mine = data.attempts.filter((a) => a.userId === me.id && a.status !== 'in_progress').sort((a, b) => b.submittedAt!.localeCompare(a.submittedAt!))
  const avg = best.length ? best.reduce((s, b) => s + b.percent, 0) / best.length : null

  return (
    <div>
      <PageHeader title="Quizzes & Assessments" description="Quizzes, exams and assignments from your active courses, with your results so far." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Due within a week" value={tasks.filter((t) => t.status === 'due_soon').length} tone="var(--warning)" />
        <StatCard label="Overdue" value={tasks.filter((t) => t.status === 'overdue').length} tone="var(--danger)" />
        <StatCard label="Average best score" value={fmtScore(avg)} hint={`${best.length} quizzes attempted`} />
        <StatCard label="Pass rate" value={fmtPct(best.length ? best.filter((b) => b.passed).length / best.length : null)} tone="var(--success)" />
      </div>

      <Section title="Your work" bodyClassName="px-0 pb-0">
        <div className="px-5"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'todo', label: 'To do', count: tasks.filter((t) => t.status !== 'done' && t.status !== 'pending').length }, { value: 'done', label: 'Submitted', count: tasks.filter((t) => t.status === 'done' || t.status === 'pending').length }, { value: 'all', label: 'All', count: tasks.length }]} /></div>
        {shown.length === 0 ? (
          <EmptyState icon={<ClipboardCheck />} title={tab === 'todo' ? 'Nothing left to do' : 'Nothing here yet'} body="Assessments from your active courses appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((t) => (
              <li key={t.id}>
                <Link to={t.link} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[var(--r-ctl)] bg-primary-soft text-primary">{t.kind === 'assignment' ? <FileText className="size-4" /> : <ListChecks className="size-4" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t.title}</span>
                    <span className="block text-sm text-muted">{look.course(t.courseId)?.title} · {t.kind === 'assignment' ? 'Assignment' : t.kind === 'exam' ? 'Exam' : 'Quiz'} · {t.detail}</span>
                  </span>
                  <span className="text-sm text-muted">{t.due ? `Due ${relativeDay(t.due).toLowerCase()}` : 'No due date'}</span>
                  <Badge color={taskStatusMeta[t.status].color}>{taskStatusMeta[t.status].label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Attempt history" className="mt-6" bodyClassName="px-0 pb-0">
        {mine.length === 0 ? (
          <EmptyState icon={<ListChecks />} title="No quiz attempts yet" />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-faint"><th className="px-5 py-2.5 font-medium">Quiz</th><th className="px-5 py-2.5 font-medium">Course</th><th className="px-5 py-2.5 font-medium">Submitted</th><th className="px-5 py-2.5 text-right font-medium">Score</th><th className="px-5 py-2.5 font-medium">Result</th></tr></thead>
              <tbody className="divide-y divide-line">
                {mine.map((a) => {
                  const q = look.quiz(a.quizId)!
                  return (
                    <tr key={a.id} className="hover:bg-surface-2">
                      <td className="px-5 py-3"><Link className="font-medium hover:text-primary" to={`/learn/quizzes/${q.id}/attempts/${a.id}`}>{q.title}</Link></td>
                      <td className="px-5 py-3 text-muted">{look.course(q.courseId)?.title}</td>
                      <td className="px-5 py-3 text-muted">{formatDate(a.submittedAt!.slice(0, 10))}</td>
                      <td className="px-5 py-3 text-right tabular">{a.status === 'pending_review' ? '—' : `${a.score}/${a.maxScore} (${Math.round(pct(a))}%)`}</td>
                      <td className="px-5 py-3">{a.status === 'pending_review' ? <Badge color="var(--secondary)">Awaiting grading</Badge> : passed(q, a) ? <Badge color="var(--success)">Passed</Badge> : <Badge color="var(--danger)">Not passed</Badge>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
