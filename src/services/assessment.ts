import type { Assignment, DateString, ID, Question, Quiz, QuizAttempt, Submission } from '@/types'

// Quiz scoring, attempt rules and assignment status. Everything here runs in
// the browser, so a determined user can bypass it — production systems must
// grade, time and count attempts on the server.

export const questionTypeLabel: Record<Question['type'], string> = {
  single: 'Multiple choice',
  multiple: 'Multiple select',
  true_false: 'True or false',
  short: 'Short answer',
}

/** Short answers without accepted answers are graded by hand. */
export const needsManual = (q: Question) => q.type === 'short' && q.correct.length === 0

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** null = needs manual grading. Multiple select is all-or-nothing. Unanswered scores 0. */
export function scoreQuestion(q: Question, answer: string[] | undefined): number | null {
  const a = (answer ?? []).filter((x) => x.trim() !== '')
  if (needsManual(q)) return a.length ? null : 0
  if (!a.length) return 0
  if (q.type === 'short') return q.correct.some((c) => norm(c) === norm(a[0])) ? q.points : 0
  const want = new Set(q.correct)
  const got = new Set(a)
  return want.size === got.size && [...want].every((x) => got.has(x)) ? q.points : 0
}

export function gradeAttempt(quiz: Pick<Quiz, 'questions'>, answers: Record<ID, string[]>, manualPoints: Record<ID, number> = {}) {
  let score = 0
  let pending = 0
  for (const q of quiz.questions) {
    const s = scoreQuestion(q, answers[q.id])
    if (s === null) {
      if (manualPoints[q.id] !== undefined) score += Math.min(q.points, Math.max(0, manualPoints[q.id]))
      else pending++
    } else score += s
  }
  const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0)
  return { score, maxScore, pending, status: pending ? ('pending_review' as const) : ('graded' as const) }
}

export const answered = (a: string[] | undefined) => !!a?.some((x) => x.trim() !== '')

/** Why a student can't start a new attempt now, or null if they can. */
export function attemptBlocker(quiz: Quiz, attempts: QuizAttempt[], userId: ID, today: DateString): string | null {
  if (quiz.status !== 'published') return 'This quiz isn’t published yet'
  if (quiz.availableFrom && today < quiz.availableFrom) return `Opens on ${quiz.availableFrom}`
  if (quiz.availableUntil && today > quiz.availableUntil) return 'This quiz has closed'
  const mine = attempts.filter((a) => a.quizId === quiz.id && a.userId === userId)
  if (mine.some((a) => a.status === 'in_progress')) return null // resume, not a new attempt
  if (quiz.maxAttempts !== null && mine.length >= quiz.maxAttempts) return `You’ve used all ${quiz.maxAttempts} attempt${quiz.maxAttempts === 1 ? '' : 's'}`
  return null
}

/** Deadline for an in-progress timed attempt, as epoch ms. */
export const deadlineOf = (quiz: Pick<Quiz, 'timeLimitMinutes'>, attempt: Pick<QuizAttempt, 'startedAt'>) =>
  quiz.timeLimitMinutes ? new Date(attempt.startedAt).getTime() + quiz.timeLimitMinutes * 60_000 : null

/** Validation for saving and publishing. Draft quizzes may be incomplete; published ones must be usable. */
export function validateQuiz(quiz: Quiz, forPublish: boolean): Record<string, string> {
  const e: Record<string, string> = {}
  if (!quiz.title.trim()) e.title = 'Give the quiz a title'
  if (!(quiz.passingScore >= 0 && quiz.passingScore <= 100)) e.passingScore = 'Passing score must be between 0 and 100'
  if (quiz.timeLimitMinutes !== null && !(quiz.timeLimitMinutes >= 1 && quiz.timeLimitMinutes <= 600)) e.timeLimitMinutes = 'Time limit must be 1–600 minutes, or turned off'
  if (quiz.maxAttempts !== null && !(Number.isInteger(quiz.maxAttempts) && quiz.maxAttempts >= 1 && quiz.maxAttempts <= 20)) e.maxAttempts = 'Attempts must be 1–20, or unlimited'
  if (quiz.availableFrom && quiz.availableUntil && quiz.availableUntil < quiz.availableFrom) e.availableUntil = 'The due date must be after the open date'
  if (!forPublish) return e
  if (!quiz.questions.length) e.questions = 'Add at least one question before publishing'
  quiz.questions.forEach((q, i) => {
    const msg = questionProblem(q)
    if (msg && !e.questions) e.questions = `Question ${i + 1}: ${msg}`
  })
  return e
}

export function questionProblem(q: Question): string | null {
  if (!q.text.trim()) return 'enter the question text'
  if (!(q.points > 0)) return 'points must be more than zero'
  if (q.type === 'short') return null
  if (q.options.length < 2) return 'add at least two answer options'
  if (q.options.some((o) => !o.text.trim())) return 'fill in or remove empty options'
  const ids = new Set(q.options.map((o) => o.id))
  const correct = q.correct.filter((c) => ids.has(c))
  if (!correct.length) return 'mark the correct answer'
  if ((q.type === 'single' || q.type === 'true_false') && correct.length !== 1) return 'mark exactly one correct answer'
  return null
}

// ——— Assignments ———

export type StudentAssignmentStatus = 'assigned' | 'overdue' | Submission['status']

export function studentStatus(a: Assignment, sub: Submission | undefined, today: DateString): StudentAssignmentStatus {
  if (sub) return sub.status
  return today > a.dueDate ? 'overdue' : 'assigned'
}

export const submissionMeta: Record<StudentAssignmentStatus | 'draft', { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'var(--faint)' },
  assigned: { label: 'Assigned', color: 'var(--primary)' },
  overdue: { label: 'Overdue', color: 'var(--danger)' },
  submitted: { label: 'Submitted', color: 'var(--secondary)' },
  late: { label: 'Submitted late', color: 'var(--warning)' },
  graded: { label: 'Graded', color: 'var(--success)' },
  returned: { label: 'Returned for revision', color: 'var(--highlight)' },
}

/** Assignments count as passed at this percentage of their maximum points. */
export const ASSIGNMENT_PASS = 50
