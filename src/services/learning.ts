import type { AppData, Course, Enrollment, EnrollmentStatus, ID, Lesson, PlatformSettings, Quiz, QuizAttempt } from '@/types'

// Course progress, enrollment and certificate rules. Pure functions over the
// data so every page (and the unit tests) computes them the same way.

export const allLessons = (course: Course): Lesson[] => course.sections.flatMap((s) => s.lessons)
export const requiredLessons = (course: Course) => allLessons(course).filter((l) => l.required)
export const lessonCount = (course: Course) => allLessons(course).length
export const courseMinutes = (course: Course) => allLessons(course).reduce((s, l) => s + l.durationMinutes, 0)

/** Completed required lessons ÷ required lessons, 0–100. A course with no required lessons is 0% until completed. */
export function progressOf(course: Course | undefined, enrollment: Pick<Enrollment, 'progress' | 'status'> | undefined): number {
  if (!course || !enrollment) return 0
  if (enrollment.status === 'completed') return 100
  const req = requiredLessons(course)
  if (!req.length) return 0
  const done = req.filter((l) => enrollment.progress[l.id]).length
  return Math.round((done / req.length) * 100)
}

/** The next lesson to study: first incomplete required lesson, then first incomplete optional one, then the last opened. */
export function nextLesson(course: Course, enrollment: Pick<Enrollment, 'progress' | 'lastLessonId'> | undefined): Lesson | undefined {
  const lessons = allLessons(course)
  if (!enrollment) return lessons[0]
  return lessons.find((l) => l.required && !enrollment.progress[l.id]) ?? lessons.find((l) => !enrollment.progress[l.id]) ?? lessons.find((l) => l.id === enrollment.lastLessonId) ?? lessons[0]
}

export const isComplete = (course: Course, enrollment: Pick<Enrollment, 'progress'>) => {
  const req = requiredLessons(course)
  return req.length > 0 && req.every((l) => enrollment.progress[l.id])
}

/** Best graded attempt for a quiz by a student. */
export function bestAttempt(attempts: QuizAttempt[], quizId: ID, userId: ID): QuizAttempt | undefined {
  return attempts
    .filter((a) => a.quizId === quizId && a.userId === userId && a.status === 'graded')
    .sort((a, b) => pct(b) - pct(a))[0]
}
export const pct = (a: Pick<QuizAttempt, 'score' | 'maxScore'>) => (a.maxScore ? Math.round((a.score / a.maxScore) * 1000) / 10 : 0)
export const passed = (quiz: Pick<Quiz, 'passingScore'>, a: Pick<QuizAttempt, 'score' | 'maxScore' | 'status'>) => a.status === 'graded' && pct(a) >= quiz.passingScore

/**
 * Whether a quiz lesson may be marked complete. When the platform requires
 * quizzes to be passed, it completes automatically on a passing attempt.
 */
export function canCompleteLesson(data: Pick<AppData, 'quizzes' | 'attempts'>, settings: PlatformSettings, lesson: Lesson, userId: ID): { ok: boolean; reason?: string } {
  if (lesson.type !== 'quiz' || !lesson.quizId) return { ok: true }
  const quiz = data.quizzes.find((q) => q.id === lesson.quizId)
  if (!quiz) return { ok: true }
  if (!settings.learning.quizMustPass) return { ok: data.attempts.some((a) => a.quizId === quiz.id && a.userId === userId && a.status !== 'in_progress'), reason: 'Submit the quiz to complete this lesson.' }
  const best = bestAttempt(data.attempts, quiz.id, userId)
  return best && passed(quiz, best) ? { ok: true } : { ok: false, reason: `Pass the quiz (${quiz.passingScore}% or more) to complete this lesson.` }
}

// ——— Enrollment ———

/** Enrollments that count as "enrolled" in totals: active and completed. */
export const counts = (s: EnrollmentStatus) => s === 'active' || s === 'completed'

/** Statuses that block a second enrollment in the same course. */
const blocking: EnrollmentStatus[] = ['active', 'completed', 'suspended']

export function enrollCheck(data: Pick<AppData, 'enrollments' | 'courses' | 'users'>, userId: ID, courseId: ID, opts: { byStaff?: boolean } = {}): string | null {
  const user = data.users.find((u) => u.id === userId)
  const course = data.courses.find((c) => c.id === courseId)
  if (!user) return 'Choose a student'
  if (!course) return 'Choose a course'
  if (user.role !== 'student') return `${user.name} isn’t a student account`
  if (!user.active) return `${user.name}’s account is deactivated`
  if (course.status !== 'published' && !opts.byStaff) return 'This course isn’t open for enrollment'
  if (course.status === 'archived') return 'Archived courses can’t take new enrollments'
  const existing = data.enrollments.find((e) => e.userId === userId && e.courseId === courseId && blocking.includes(e.status))
  if (existing) {
    if (existing.status === 'suspended') return `${user.name}’s enrollment in this course is suspended — reactivate it instead`
    return existing.status === 'completed' ? `${user.name} has already completed this course` : `${user.name} is already enrolled in this course`
  }
  return null
}

export const enrollmentStatusMeta: Record<EnrollmentStatus, { label: string; color: string; hint: string }> = {
  active: { label: 'Active', color: 'var(--primary)', hint: 'Studying; counts in active enrollments' },
  completed: { label: 'Completed', color: 'var(--success)', hint: 'All required lessons done' },
  suspended: { label: 'Suspended', color: 'var(--warning)', hint: 'Access paused; excluded from active totals' },
  cancelled: { label: 'Cancelled', color: 'var(--faint)', hint: 'Ended; kept for history only' },
}

// ——— Certificates ———

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
/** Human-friendly code. Random, not a cryptographic credential — production verification needs a server. */
export function certificateCode(random: () => number = Math.random) {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('')
  return `LCT-${part()}-${part()}`
}

export function certificateEligibility(data: Pick<AppData, 'courses' | 'enrollments' | 'certificates'>, enrollmentId: ID): { ok: true } | { ok: false; reason: string } {
  const e = data.enrollments.find((x) => x.id === enrollmentId)
  if (!e) return { ok: false, reason: 'Enrollment not found' }
  const course = data.courses.find((c) => c.id === e.courseId)
  if (!course) return { ok: false, reason: 'Course not found' }
  if (!course.awardsCertificate) return { ok: false, reason: 'This course doesn’t award a certificate' }
  if (e.status !== 'completed') return { ok: false, reason: 'The course isn’t complete yet' }
  if (data.certificates.some((c) => c.enrollmentId === e.id)) return { ok: false, reason: 'A certificate was already issued for this enrollment' }
  return { ok: true }
}

/** Learning streak: consecutive days (ending today or yesterday) with any study activity. */
export function streak(days: Set<string>, today: string, addDays: (d: string, n: number) => string): number {
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}
