import type { AppData, Course, DateString, ID } from '@/types'
import { addDays, dateOf, diffDays, formatDate, parseDate, startOfWeek } from '@/lib/date'
import { bestAttempt, counts, passed, pct, progressOf } from './learning'

// One set of metric definitions for every dashboard and report:
//
//   enrolled         active + completed enrollments (suspended and cancelled excluded)
//   active           enrollments with status "active"
//   completion rate  completed ÷ enrolled
//   average score    mean of each student's best graded attempt per quiz
//   pass rate        share of those best attempts at or above the quiz's passing score
//   engagement       share of active enrollments with study activity in the last 14 days
//   learning time    sum of recorded study minutes

export interface Period {
  from: DateString
  to: DateString
}

export const inPeriod = (iso: string | null | undefined, p: Period) => {
  if (!iso) return false
  const d = iso.length > 10 ? dateOf(iso) : iso
  return d >= p.from && d <= p.to
}

export function scope(data: AppData, courseIds?: ID[]) {
  const ids = courseIds ? new Set(courseIds) : null
  const has = (id: ID) => !ids || ids.has(id)
  const quizzes = data.quizzes.filter((q) => has(q.courseId))
  const quizIds = new Set(quizzes.map((q) => q.id))
  return {
    enrollments: data.enrollments.filter((e) => has(e.courseId)),
    events: data.events.filter((e) => has(e.courseId)),
    quizzes,
    attempts: data.attempts.filter((a) => quizIds.has(a.quizId)),
  }
}

/** Best graded attempt for each (student, quiz) pair. */
export function bestAttempts(data: AppData, courseIds?: ID[]) {
  const s = scope(data, courseIds)
  const out: { quizId: ID; userId: ID; percent: number; passed: boolean }[] = []
  const seen = new Set<string>()
  for (const a of s.attempts) {
    const key = a.quizId + '|' + a.userId
    if (a.status !== 'graded' || seen.has(key)) continue
    seen.add(key)
    const quiz = s.quizzes.find((q) => q.id === a.quizId)!
    const best = bestAttempt(s.attempts, a.quizId, a.userId)!
    out.push({ quizId: a.quizId, userId: a.userId, percent: pct(best), passed: passed(quiz, best) })
  }
  return out
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function metrics(data: AppData, today: DateString, courseIds?: ID[], period?: Period) {
  const s = scope(data, courseIds)
  const enrolled = s.enrollments.filter((e) => counts(e.status))
  const active = enrolled.filter((e) => e.status === 'active')
  const completed = enrolled.filter((e) => e.status === 'completed')
  const best = bestAttempts(data, courseIds)
  const recent = { from: addDays(today, -13), to: today }
  const recentPairs = new Set(s.events.filter((e) => inPeriod(e.at, recent)).map((e) => e.userId + '|' + e.courseId))
  const events = period ? s.events.filter((e) => inPeriod(e.at, period)) : s.events
  return {
    enrolled: enrolled.length,
    active: active.length,
    completed: completed.length,
    suspended: s.enrollments.filter((e) => e.status === 'suspended').length,
    completionRate: enrolled.length ? completed.length / enrolled.length : null,
    avgScore: mean(best.map((b) => b.percent)),
    passRate: best.length ? best.filter((b) => b.passed).length / best.length : null,
    engagement: active.length ? active.filter((e) => recentPairs.has(e.userId + '|' + e.courseId)).length / active.length : null,
    minutes: events.reduce((t, e) => t + e.minutes, 0),
    lessonsCompleted: events.filter((e) => e.lessonId !== null).length,
    learners: new Set(enrolled.map((e) => e.userId)).size,
    newEnrollments: period ? s.enrollments.filter((e) => inPeriod(e.enrolledAt, period)).length : enrolled.length,
    completions: period ? s.enrollments.filter((e) => inPeriod(e.completedAt, period)).length : completed.length,
  }
}

/** Splits a period into chart buckets: days for ≤ 31 days, weeks beyond that. */
export function buckets(p: Period): { label: string; from: DateString; to: DateString }[] {
  const days = diffDays(p.from, p.to) + 1
  const out: { label: string; from: DateString; to: DateString }[] = []
  if (days <= 31) {
    for (let d = p.from; d <= p.to; d = addDays(d, 1)) out.push({ label: days <= 7 ? parseDate(d).toLocaleDateString(undefined, { weekday: 'short' }) : formatDate(d), from: d, to: d })
    return out
  }
  for (let w = startOfWeek(p.from); w <= p.to; w = addDays(w, 7)) {
    const from = w < p.from ? p.from : w
    const to = addDays(w, 6) > p.to ? p.to : addDays(w, 6)
    out.push({ label: formatDate(from), from, to })
  }
  return out
}

export function enrollmentTrend(data: AppData, p: Period, courseIds?: ID[]) {
  const s = scope(data, courseIds)
  return buckets(p).map((b) => ({
    label: b.label,
    enrollments: s.enrollments.filter((e) => inPeriod(e.enrolledAt, b)).length,
    completions: s.enrollments.filter((e) => inPeriod(e.completedAt, b)).length,
  }))
}

export function activityTrend(data: AppData, p: Period, filter: { userId?: ID; courseIds?: ID[] } = {}) {
  const events = scope(data, filter.courseIds).events.filter((e) => !filter.userId || e.userId === filter.userId)
  return buckets(p).map((b) => {
    const inB = events.filter((e) => inPeriod(e.at, b))
    return {
      label: b.label,
      minutes: inB.reduce((t, e) => t + e.minutes, 0),
      lessons: inB.filter((e) => e.lessonId !== null).length,
      learners: new Set(inB.map((e) => e.userId)).size,
    }
  })
}

export function ratingOf(data: AppData, courseId: ID) {
  const rs = data.reviews.filter((r) => r.courseId === courseId && r.status === 'published')
  return { rating: rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0, count: rs.length }
}

export function courseStats(data: AppData, course: Course, today: DateString) {
  const m = metrics(data, today, [course.id])
  const live = data.enrollments.filter((e) => e.courseId === course.id && counts(e.status))
  return {
    ...m,
    avgProgress: mean(live.map((e) => progressOf(course, e))),
    ...ratingOf(data, course.id),
  }
}

/** Active enrollments that may need an instructor's attention. Rules are deliberately simple and explained in the UI. */
export function needsAttention(data: AppData, today: DateString, courseIds?: ID[]) {
  const s = scope(data, courseIds)
  const out: { enrollmentId: ID; userId: ID; courseId: ID; reasons: string[] }[] = []
  for (const e of s.enrollments.filter((x) => x.status === 'active')) {
    const reasons: string[] = []
    const last = e.lastActivityAt ? dateOf(e.lastActivityAt) : dateOf(e.enrolledAt)
    const idle = diffDays(last, today)
    if (idle >= 14) reasons.push(`No activity for ${idle} days`)
    const overdue = data.assignments.filter((a) => a.courseId === e.courseId && a.status === 'assigned' && a.dueDate < today && !data.submissions.some((x) => x.assignmentId === a.id && x.userId === e.userId))
    if (overdue.length) reasons.push(`${overdue.length} overdue assignment${overdue.length > 1 ? 's' : ''}`)
    for (const q of s.quizzes.filter((q) => q.courseId === e.courseId)) {
      const mine = s.attempts.filter((a) => a.quizId === q.id && a.userId === e.userId && a.status === 'graded')
      if (mine.length && !mine.some((a) => passed(q, a))) reasons.push(`Not yet passed “${q.title}”`)
    }
    if (reasons.length) out.push({ enrollmentId: e.id, userId: e.userId, courseId: e.courseId, reasons })
  }
  return out
}

export const fmtPct = (v: number | null, digits = 0) => (v === null ? '—' : `${(v * 100).toFixed(digits)}%`)
export const fmtScore = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`)
