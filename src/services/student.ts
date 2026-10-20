import type { AppData, Course, DateString, ID } from '@/types'
import { addDays, dateOf, startOfWeek } from '@/lib/date'
import { ratingOf } from './analytics'
import { counts, passed, pct, streak } from './learning'

// Numbers for one student, shared by the dashboard, history and analytics
// pages so they always agree.

export function studentSummary(data: AppData, userId: ID, today: DateString) {
  const mine = data.enrollments.filter((e) => e.userId === userId)
  const events = data.events.filter((e) => e.userId === userId)
  const week = startOfWeek(today)
  const weekMinutes = events.filter((e) => dateOf(e.at) >= week).reduce((s, e) => s + e.minutes, 0)
  return {
    enrolled: mine.filter((e) => counts(e.status)).length,
    inProgress: mine.filter((e) => e.status === 'active').length,
    completed: mine.filter((e) => e.status === 'completed').length,
    minutes: events.reduce((s, e) => s + e.minutes, 0),
    lessons: events.filter((e) => e.lessonId).length,
    certificates: data.certificates.filter((c) => c.userId === userId && c.status === 'valid').length,
    streak: streak(new Set(events.map((e) => dateOf(e.at))), today, addDays),
    weekMinutes,
  }
}

export type Achievement = { id: string; kind: 'certificate' | 'completion' | 'quiz'; title: string; detail: string; at: string; link: string }

export function achievements(data: AppData, userId: ID): Achievement[] {
  const out: Achievement[] = []
  const course = (id: ID) => data.courses.find((c) => c.id === id)
  for (const c of data.certificates.filter((x) => x.userId === userId && x.status === 'valid')) out.push({ id: c.id, kind: 'certificate', title: 'Certificate earned', detail: c.courseTitle, at: c.issuedAt, link: `/learn/certificates/${c.id}` })
  for (const e of data.enrollments.filter((x) => x.userId === userId && x.status === 'completed' && !course(x.courseId)?.awardsCertificate)) out.push({ id: e.id, kind: 'completion', title: 'Course completed', detail: course(e.courseId)?.title ?? '', at: e.completedAt!, link: `/learn/course/${e.courseId}/overview` })
  for (const a of data.attempts.filter((x) => x.userId === userId && x.status === 'graded')) {
    const q = data.quizzes.find((z) => z.id === a.quizId)
    if (q && passed(q, a) && pct(a) >= 90) out.push({ id: a.id, kind: 'quiz', title: `Scored ${Math.round(pct(a))}%`, detail: q.title, at: a.submittedAt!, link: `/learn/quizzes/${q.id}/attempts/${a.id}` })
  }
  return out.sort((x, y) => y.at.localeCompare(x.at))
}

/**
 * Rule-based recommendations (not AI): published courses the student isn't
 * taking, scored by shared category or subject with their courses, their
 * stated interests, and a level that follows on from what they've finished.
 */
export function recommendations(data: AppData, userId: ID, limit = 3): { course: Course; reason: string }[] {
  const user = data.users.find((u) => u.id === userId)
  const mine = data.enrollments.filter((e) => e.userId === userId && e.status !== 'cancelled')
  const taken = new Set(mine.map((e) => e.courseId))
  const myCourses = mine.map((e) => data.courses.find((c) => c.id === e.courseId)).filter(Boolean) as Course[]
  const cats = new Map<ID, number>()
  for (const c of myCourses) cats.set(c.categoryId, (cats.get(c.categoryId) ?? 0) + 1)
  const finished = new Set(mine.filter((e) => e.status === 'completed').map((e) => data.courses.find((c) => c.id === e.courseId)?.level))
  const interests = (user?.interests ?? []).map((i) => i.toLowerCase())
  return data.courses
    .filter((c) => c.status === 'published' && !taken.has(c.id))
    .map((c) => {
      const cat = data.categories.find((x) => x.id === c.categoryId)
      let score = (cats.get(c.categoryId) ?? 0) * 3 + ratingOf(data, c.id).rating * 0.3
      let reason = 'Highly rated by other learners'
      if (myCourses.some((m) => m.subjectId && m.subjectId === c.subjectId)) (score += 2), (reason = `Continues a subject you’re studying`)
      else if (cats.get(c.categoryId)) reason = `Because you’re studying ${cat?.name}`
      const hit = interests.find((i) => [c.title, ...c.tags, cat?.name ?? ''].some((s) => s.toLowerCase().includes(i.split(' ')[0])))
      if (hit) (score += 2), (reason = cats.get(c.categoryId) ? reason : `Matches your interest in ${hit}`)
      if (c.level === 'intermediate' && finished.has('beginner')) score += 1
      if (c.prerequisites.some((p) => myCourses.some((m) => p.includes(m.title)))) (score += 3), (reason = 'A next step after a course you’ve taken')
      return { course: c, reason, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
