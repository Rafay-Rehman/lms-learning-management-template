import type { AppData, DateString, ID } from '@/types'
import { diffDays } from '@/lib/date'
import { studentStatus } from './assessment'
import { bestAttempt, passed } from './learning'

// A student's to-do list: quizzes and assignments from their active courses,
// with one status vocabulary used by the dashboard, calendar and badges.

export interface Task {
  id: ID
  kind: 'quiz' | 'exam' | 'assignment'
  title: string
  courseId: ID
  due: DateString | null
  status: 'overdue' | 'due_soon' | 'upcoming' | 'open' | 'done' | 'pending'
  detail: string
  link: string
}

export function studentTasks(data: AppData, userId: ID, today: DateString): Task[] {
  const active = new Set(data.enrollments.filter((e) => e.userId === userId && e.status === 'active').map((e) => e.courseId))
  const out: Task[] = []
  const timing = (due: DateString | null): Task['status'] => (!due ? 'open' : due < today ? 'overdue' : diffDays(today, due) <= 7 ? 'due_soon' : 'upcoming')
  for (const q of data.quizzes) {
    if (!active.has(q.courseId) || q.status !== 'published') continue
    const mine = data.attempts.filter((a) => a.quizId === q.id && a.userId === userId)
    const best = bestAttempt(data.attempts, q.id, userId)
    const pending = mine.some((a) => a.status === 'pending_review')
    const done = (best && passed(q, best)) || (q.maxAttempts !== null && mine.filter((a) => a.status !== 'in_progress').length >= q.maxAttempts)
    out.push({
      id: q.id, kind: q.kind, title: q.title, courseId: q.courseId, due: q.availableUntil,
      status: pending ? 'pending' : done ? 'done' : q.availableUntil && q.availableUntil < today ? 'overdue' : timing(q.availableUntil),
      detail: pending ? 'Waiting for grading' : best ? `Best score ${Math.round((best.score / best.maxScore) * 100)}%` : `${q.questions.length} questions${q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min` : ''}`,
      link: `/learn/quizzes/${q.id}`,
    })
  }
  for (const a of data.assignments) {
    if (!active.has(a.courseId) || a.status === 'draft') continue
    const sub = data.submissions.find((s) => s.assignmentId === a.id && s.userId === userId)
    const s = studentStatus(a, sub, today)
    out.push({
      id: a.id, kind: 'assignment', title: a.title, courseId: a.courseId, due: a.dueDate,
      status: s === 'graded' || s === 'submitted' || s === 'late' ? (s === 'graded' ? 'done' : 'pending') : s === 'returned' ? 'due_soon' : timing(a.dueDate),
      detail: s === 'graded' ? `Graded ${sub!.grade}/${a.maxPoints}` : s === 'returned' ? 'Returned for revision' : s === 'submitted' || s === 'late' ? 'Submitted — awaiting grade' : `${a.maxPoints} points`,
      link: `/learn/assignments/${a.id}`,
    })
  }
  const rank = { overdue: 0, due_soon: 1, upcoming: 2, open: 3, pending: 4, done: 5 }
  return out.sort((x, y) => rank[x.status] - rank[y.status] || (x.due ?? '9').localeCompare(y.due ?? '9'))
}

export const taskStatusMeta: Record<Task['status'], { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: 'var(--danger)' },
  due_soon: { label: 'Due soon', color: 'var(--warning)' },
  upcoming: { label: 'Upcoming', color: 'var(--primary)' },
  open: { label: 'Open', color: 'var(--secondary)' },
  pending: { label: 'Awaiting grade', color: 'var(--secondary)' },
  done: { label: 'Done', color: 'var(--success)' },
}

export const isOpenTask = (t: Task) => t.status === 'overdue' || t.status === 'due_soon'
