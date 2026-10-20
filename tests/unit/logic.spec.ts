import { expect, test } from '@playwright/test'
import type { AppData, Quiz } from '../../src/types'
import { createSeed } from '../../src/data/seed'
import { toCsv } from '../../src/lib/csv'
import { attemptBlocker, gradeAttempt, questionProblem, scoreQuestion, studentStatus, validateQuiz } from '../../src/services/assessment'
import { buckets, metrics } from '../../src/services/analytics'
import { isSafeUrl, publishProblems, validateCourse, videoSource } from '../../src/services/courses'
import { allLessons, bestAttempt, canCompleteLesson, certificateEligibility, enrollCheck, isComplete, nextLesson, passed, progressOf, requiredLessons } from '../../src/services/learning'
import { can } from '../../src/services/permissions'
import { contrastRatio, DEFAULT_THEME, normalizeHex, PRESETS, sanitizeTheme, themeVars } from '../../src/services/theme'
import { createActions } from '../../src/state/actions'

const T = '2026-10-20'
const data = createSeed(T)

/** Runs store actions against an in-memory snapshot, as the app does. */
function store(initial: AppData = structuredClone(data), userId = 'u-maya') {
  let d: AppData = { ...initial, currentUserId: userId }
  const actions = createActions(() => d, (n) => (d = n))
  return { actions, get: () => d, as: (id: string) => (d = { ...d, currentUserId: id }) }
}

test('seed is deterministic and internally consistent', () => {
  expect(JSON.stringify(createSeed(T).enrollments)).toBe(JSON.stringify(data.enrollments))
  const users = new Set(data.users.map((u) => u.id))
  const courses = new Map(data.courses.map((c) => [c.id, c]))
  for (const e of data.enrollments) {
    expect(users.has(e.userId)).toBe(true)
    const c = courses.get(e.courseId)!
    expect(c).toBeTruthy()
    // Completed enrollments really have every required lesson done.
    if (e.status === 'completed') expect(isComplete(c, e)).toBe(true)
    // Progress only references lessons that exist.
    const ids = new Set(allLessons(c).map((l) => l.id))
    for (const id of Object.keys(e.progress)) expect(ids.has(id)).toBe(true)
  }
  // No duplicate active enrollments.
  const keys = data.enrollments.filter((e) => e.status !== 'cancelled').map((e) => e.userId + e.courseId)
  expect(new Set(keys).size).toBe(keys.length)
  // Every certificate belongs to a completed enrollment in a certificate-awarding course, once.
  for (const cert of data.certificates) {
    const e = data.enrollments.find((x) => x.id === cert.enrollmentId)!
    expect(e.status).toBe('completed')
    expect(courses.get(e.courseId)!.awardsCertificate).toBe(true)
  }
  expect(new Set(data.certificates.map((c) => c.enrollmentId)).size).toBe(data.certificates.length)
  expect(new Set(data.certificates.map((c) => c.code)).size).toBe(data.certificates.length)
  // Every completed quiz lesson has a passing attempt behind it.
  for (const e of data.enrollments) {
    const c = courses.get(e.courseId)!
    for (const l of allLessons(c).filter((x) => x.quizId && e.progress[x.id])) {
      const quiz = data.quizzes.find((q) => q.id === l.quizId)!
      const best = bestAttempt(data.attempts, quiz.id, e.userId)
      expect(best && passed(quiz, best), `${e.userId} ${l.id}`).toBeTruthy()
    }
  }
  // Variety: not every course sits at the same progress.
  const progresses = new Set(data.enrollments.map((e) => progressOf(courses.get(e.courseId), e)))
  expect(progresses.size).toBeGreaterThan(10)
  expect(data.attempts.some((a) => a.status === 'pending_review')).toBe(true)
  expect(data.certificates.some((c) => c.status === 'revoked')).toBe(true)
})

test('progress: required lessons only, next lesson, completion', () => {
  const course = data.courses.find((c) => c.id === 'c-py-data')!
  const req = requiredLessons(course)
  const optional = allLessons(course).find((l) => !l.required)!
  expect(progressOf(course, { progress: { [optional.id]: 'x' }, status: 'active' })).toBe(0)
  const half = Object.fromEntries(req.slice(0, req.length / 2).map((l) => [l.id, 'x']))
  expect(progressOf(course, { progress: half, status: 'active' })).toBe(50)
  expect(nextLesson(course, { progress: half, lastLessonId: null })!.id).toBe(req[req.length / 2].id)
  expect(isComplete(course, { progress: Object.fromEntries(req.map((l) => [l.id, 'x'])) })).toBe(true)
  expect(progressOf(course, { progress: {}, status: 'completed' })).toBe(100)
})

test('quiz scoring: points, all-or-nothing multi-select, unanswered and manual questions', () => {
  const quiz = data.quizzes.find((q) => q.id === 'q-py-final')!
  const [single, multi, tf, , written] = quiz.questions
  expect(scoreQuestion(single, single.correct)).toBe(single.points)
  expect(scoreQuestion(multi, multi.correct.slice(1))).toBe(0)
  expect(scoreQuestion(multi, [...multi.correct].reverse())).toBe(multi.points)
  expect(scoreQuestion(tf, undefined)).toBe(0)
  expect(scoreQuestion(written, ['An answer'])).toBeNull()
  expect(scoreQuestion(written, [])).toBe(0)
  const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correct.length ? q.correct : ['Written answer']]))
  const pending = gradeAttempt(quiz, answers)
  expect(pending.status).toBe('pending_review')
  const done = gradeAttempt(quiz, answers, { [written.id]: 3 })
  expect(done.status).toBe('graded')
  expect(done.score).toBe(done.maxScore - 1)
  // Short answers are compared case- and whitespace-insensitively.
  const short = data.quizzes.find((q) => q.id === 'q-js-1')!.questions[3]
  expect(scoreQuestion(short, ['  CONST '])).toBe(1)
})

test('quiz validation and attempt limits', () => {
  const quiz: Quiz = { ...data.quizzes.find((q) => q.id === 'q-stats-exam')! }
  expect(validateQuiz({ ...quiz, questions: [] }, true).questions).toMatch(/at least one/)
  expect(validateQuiz({ ...quiz, questions: [] }, false).questions).toBeUndefined()
  const q = quiz.questions[0]
  expect(questionProblem({ ...q, correct: [] })).toMatch(/correct/)
  expect(questionProblem({ ...q, correct: [q.options[0].id, q.options[1].id] })).toMatch(/exactly one/)
  const attempts = [{ ...data.attempts[0], quizId: quiz.id, userId: 'u-x', status: 'graded' as const }]
  expect(attemptBlocker(quiz, attempts, 'u-x', T)).toMatch(/used all 1 attempt/)
  expect(attemptBlocker({ ...quiz, availableUntil: '2026-10-01' }, [], 'u-x', T)).toMatch(/closed/)
  expect(attemptBlocker({ ...quiz, status: 'draft' }, [], 'u-x', T)).toMatch(/published/)
})

test('enrollment: duplicates, drafts and suspended enrollments', () => {
  expect(enrollCheck(data, 'u-maya', 'c-py-data')).toMatch(/already enrolled/)
  expect(enrollCheck(data, 'u-maya', 'c-js-ess')).toMatch(/already completed/)
  expect(enrollCheck(data, 'u-maya', 'c-spanish-a1')).toMatch(/isn’t open/)
  expect(enrollCheck(data, 'u-okafor', 'c-py-intro')).toMatch(/isn’t a student/)
  expect(enrollCheck(data, 'u-maya', 'c-dig-mkt')).toBeNull()
  const s = store()
  expect(s.actions.enroll('u-maya', 'c-dig-mkt').ok).toBe(true)
  expect(s.actions.enroll('u-maya', 'c-dig-mkt').ok).toBe(false)
  // Suspended or cancelled enrollments don't count as active.
  const before = metrics(s.get(), T).active
  const e = s.get().enrollments.find((x) => x.userId === 'u-maya' && x.courseId === 'c-dig-mkt')!
  s.as('u-whitfield')
  expect(s.actions.setEnrollmentStatus(e.id, 'suspended').ok).toBe(true)
  expect(metrics(s.get(), T).active).toBe(before - 1)
})

test('lesson completion → course completion → one certificate', () => {
  const s = store()
  s.actions.enroll('u-maya', 'c-pm-ess') // awards no certificate
  s.actions.enroll('u-maya', 'c-acad-write')
  const e = s.get().enrollments.find((x) => x.userId === 'u-maya' && x.courseId === 'c-acad-write')!
  const course = s.get().courses.find((c) => c.id === 'c-acad-write')!
  const req = requiredLessons(course)
  for (const l of req.slice(0, -1)) expect(s.actions.completeLesson(e.id, l.id).ok).toBe(true)
  expect(s.get().enrollments.find((x) => x.id === e.id)!.status).toBe('active')
  expect(s.get().certificates.filter((c) => c.enrollmentId === e.id)).toHaveLength(0)
  s.actions.completeLesson(e.id, req.at(-1)!.id)
  expect(s.get().enrollments.find((x) => x.id === e.id)!.status).toBe('completed')
  expect(s.get().certificates.filter((c) => c.enrollmentId === e.id)).toHaveLength(1)
  // Completing again or re-issuing never duplicates the certificate.
  s.actions.completeLesson(e.id, req[0].id)
  s.as('u-whitfield')
  expect(s.actions.issueCertificate(e.id).ok).toBe(false)
  expect(s.get().certificates.filter((c) => c.enrollmentId === e.id)).toHaveLength(1)
  expect(certificateEligibility(s.get(), e.id).ok).toBe(false)
})

test('quiz lessons complete only after a passing attempt; submissions cannot be duplicated', () => {
  const s = store()
  const e = s.get().enrollments.find((x) => x.userId === 'u-maya' && x.courseId === 'c-ux-research')!
  const course = s.get().courses.find((c) => c.id === 'c-ux-research')!
  const quizLesson = allLessons(course).find((l) => l.type === 'quiz')!
  expect(canCompleteLesson(s.get(), s.get().settings, quizLesson, 'u-maya').ok).toBe(false)
  expect(s.actions.completeLesson(e.id, quizLesson.id).ok).toBe(false)
  const quiz = s.get().quizzes.find((q) => q.id === quizLesson.quizId)!
  const start = s.actions.startAttempt(quiz.id)
  expect(start.ok).toBe(true)
  const id = (start as { id: string }).id
  // Starting again resumes the same attempt.
  expect((s.actions.startAttempt(quiz.id) as { id: string }).id).toBe(id)
  const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correct]))
  expect(s.actions.submitAttempt(id, answers).ok).toBe(true)
  expect(s.actions.submitAttempt(id, answers).ok).toBe(false)
  expect(s.get().enrollments.find((x) => x.id === e.id)!.progress[quizLesson.id]).toBeTruthy()
})

test('course rules: validation, publishing, review and delete protection', () => {
  const s = store(undefined, 'u-reyes')
  const course = s.get().courses.find((c) => c.id === 'c-js-ess')!
  expect(validateCourse({ ...course, title: 'JS' }, s.get()).title).toBeTruthy()
  expect(publishProblems({ ...course, objectives: [] }, s.get().settings)[0]).toMatch(/objective/)
  // Instructors can't edit other people's courses.
  expect(s.actions.saveCourse({ ...s.get().courses.find((c) => c.id === 'c-stats')!, title: 'Hijacked' }).ok).toBe(false)
  // With review required, an instructor's publish becomes "in review".
  const draft = (s.actions.duplicateCourse('c-js-ess') as { id: string }).id
  const r = s.actions.setCourseStatus(draft, 'published')
  expect(r.ok && r.id).toBe('review')
  // Courses with enrollments can't be deleted; empty drafts can.
  expect(s.actions.deleteCourse('c-js-ess').ok).toBe(false)
  expect(s.actions.deleteCourse(draft).ok).toBe(true)
  // Unpublishing keeps enrollments.
  const before = s.get().enrollments.filter((e) => e.courseId === 'c-js-ess').length
  expect(s.actions.setCourseStatus('c-js-ess', 'draft').ok).toBe(true)
  expect(s.get().enrollments.filter((e) => e.courseId === 'c-js-ess').length).toBe(before)
})

test('subjects: unique codes per year, safe delete and archive', () => {
  const s = store(undefined, 'u-whitfield')
  const cs101 = s.get().subjects.find((x) => x.code === 'CS101')!
  const copy = { ...cs101, id: 'sub-new', name: 'Programming Fundamentals II' }
  expect(s.actions.saveSubject(copy).ok).toBe(false)
  expect(s.actions.saveSubject({ ...copy, yearId: 'ay-next', termId: null }).ok).toBe(true)
  expect(s.actions.deleteSubjects([cs101.id]).ok).toBe(false)
  expect(s.actions.setSubjectStatus([cs101.id], 'archived').ok).toBe(true)
  expect(s.get().courses.filter((c) => c.subjectId === cs101.id).length).toBeGreaterThan(0)
  expect(s.actions.deleteSubjects(['sub-new']).ok).toBe(true)
  expect(s.actions.deleteRecord('departments', 'dep-cs').ok).toBe(false)
  // Students can't manage academic data.
  s.as('u-maya')
  expect(s.actions.saveSubject({ ...copy, id: 'sub-x', code: 'ZZ100' }).ok).toBe(false)
})

test('assignments: late rules and statuses', () => {
  const a = data.assignments[0]
  expect(studentStatus(a, undefined, '2000-01-01')).toBe('assigned')
  expect(studentStatus(a, undefined, '2999-01-01')).toBe('overdue')
  const s = store()
  expect(s.actions.submitAssignment(a.id, { text: '', attachments: [] }).ok).toBe(false)
  expect(s.actions.submitAssignment(a.id, { text: 'My report', attachments: [] }).ok).toBe(true)
  expect(s.actions.submitAssignment(a.id, { text: 'Again', attachments: [] }).ok).toBe(false)
})

test('analytics: definitions are consistent', () => {
  const m = metrics(data, T)
  expect(m.enrolled).toBe(m.active + m.completed)
  expect(m.completionRate).toBeCloseTo(m.completed / m.enrolled)
  expect(buckets({ from: '2026-10-14', to: T })).toHaveLength(7)
  expect(buckets({ from: '2026-07-01', to: T }).length).toBeLessThan(20)
})

test('permissions', () => {
  const admin = data.users.find((u) => u.role === 'admin')!
  const student = data.users.find((u) => u.role === 'student')!
  expect(can(admin, 'platform.manage')).toBe(true)
  expect(can(student, 'platform.manage')).toBe(false)
  expect(can({ ...admin, active: false }, 'platform.manage')).toBe(false)
})

test('theme: presets are readable, input is sanitised', () => {
  for (const p of PRESETS) {
    for (const pal of [p.theme.light, p.theme.dark]) {
      expect(contrastRatio(pal.text, pal.background), p.id).toBeGreaterThanOrEqual(7)
      expect(contrastRatio(pal.muted, pal.surface), p.id).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(pal.sidebarText, pal.sidebar), p.id).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(pal.primary, pal.surface), p.id).toBeGreaterThanOrEqual(3)
    }
  }
  expect(normalizeHex('abc')).toBe('#aabbcc')
  expect(normalizeHex('#12345g')).toBeNull()
  const bad = sanitizeTheme({ light: { primary: 'red; background:url(x)' }, radius: 999, mode: 'neon' })
  expect(bad.light.primary).toBe(DEFAULT_THEME.light.primary)
  expect(bad.radius).toBe(24)
  expect(bad.mode).toBe('light')
  expect(themeVars(DEFAULT_THEME, false)['--primary']).toBe(DEFAULT_THEME.light.primary)
})

test('urls and csv are safe', () => {
  expect(isSafeUrl('javascript:alert(1)')).toBe(false)
  expect(isSafeUrl('//evil.example')).toBe(false)
  expect(isSafeUrl('/assets/x.pdf')).toBe(true)
  expect(isSafeUrl('https://example.com')).toBe(true)
  expect(toCsv([['=SUM(A1)', 'a,b']])).toBe(`'=SUM(A1),"a,b"`)
})

test('video sources', () => {
  ;(globalThis as { location?: { origin: string } }).location = { origin: 'http://localhost' }
  expect(videoSource('https://www.youtube.com/watch?v=abc')!.src).toContain('youtube-nocookie.com/embed/abc')
  expect(videoSource('https://cdn.example.com/a.mp4')!.kind).toBe('file')
  expect(videoSource('javascript:alert(1)')).toBeNull()
  expect(videoSource('')).toBeNull()
})

test('csv round trip', async () => {
  const { parseCsv } = await import('../../src/lib/csv')
  const rows = [['a', 'b,c', 'say "hi"'], ['line\nbreak', '', 'x']]
  expect(parseCsv(toCsv(rows))).toEqual(rows)
})
