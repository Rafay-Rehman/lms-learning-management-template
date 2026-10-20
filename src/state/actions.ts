import type { AcademicYear, Announcement, AppData, Assignment, AuditEntry, BankQuestion, Category, Certificate, Course, CourseStatus, Department, Enrollment, EnrollmentStatus, Faculty, ID, Notification, PlatformSettings, Quiz, Review, StudentGroup, Subject, SubjectCategory, Submission, Term, Theme, User, WebsiteConfig } from '@/types'
import { createSeed } from '@/data/seed'
import { today } from '@/lib/date'
import { attemptBlocker, gradeAttempt, questionProblem, validateQuiz } from '@/services/assessment'
import { isSafeUrl, publishProblems, slugify, validateCourse } from '@/services/courses'
import { allLessons, canCompleteLesson, certificateCode, certificateEligibility, enrollCheck, isComplete, passed } from '@/services/learning'
import { can, canEditCourse } from '@/services/permissions'
import { sanitizeTheme } from '@/services/theme'

// Every change to the data goes through one of these actions. Each validates
// against the latest state and either commits a new snapshot or returns
// errors, so the same rules apply whichever page triggers them.
//
// Role checks here make the demo behave correctly but are not security:
// with a backend, the server must repeat them for every request.

export type Result<T = ID> = { ok: true; id: T } | { ok: false; errors: Record<string, string> }
const fail = (message: string, field = 'form'): Result<never> => ({ ok: false, errors: { [field]: message } })
const errs = (e: Record<string, string>): Result<never> => ({ ok: false, errors: e })
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 10)}`
const now = () => new Date().toISOString()
const replace = <T extends { id: ID }>(list: T[], id: ID, fn: (x: T) => T) => list.map((x) => (x.id === id ? fn(x) : x))
const upsert = <T extends { id: ID }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? replace(list, item.id, () => item) : [...list, item])
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

export function createActions(get: () => AppData, commit: (d: AppData) => void) {
  const me = () => get().users.find((u) => u.id === get().currentUserId)

  function audit(d: AppData, message: string, link: string, area: AuditEntry['area']): AppData {
    return { ...d, audit: [{ id: uid('au'), actorId: d.currentUserId, message, link, area, at: now() }, ...d.audit].slice(0, 400) }
  }
  function notify(d: AppData, userIds: ID[], n: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): AppData {
    const at = now()
    const fresh = [...new Set(userIds)].map((userId) => ({ ...n, id: uid('n'), userId, read: false, createdAt: at }))
    return { ...d, notifications: [...fresh, ...d.notifications].slice(0, 600) }
  }
  const admins = (d: AppData) => d.users.filter((u) => u.role === 'admin' && u.active).map((u) => u.id)
  const courseOf = (d: AppData, id: ID) => d.courses.find((c) => c.id === id)
  const nameOf = (d: AppData, id: ID) => d.users.find((u) => u.id === id)?.name ?? 'Someone'

  /** Marks an enrollment completed when the course rules are satisfied, and issues the certificate. */
  function settleCompletion(d: AppData, enrollmentId: ID): AppData {
    const e = d.enrollments.find((x) => x.id === enrollmentId)
    const course = e && courseOf(d, e.courseId)
    if (!e || !course || e.status !== 'active' || !isComplete(course, e)) return d
    const at = now()
    d = { ...d, enrollments: replace(d.enrollments, e.id, (x) => ({ ...x, status: 'completed', completedAt: at })) }
    d = notify(d, [e.userId], { kind: 'completion', title: `Course completed: ${course.title}`, body: 'Every required lesson is done. Well done!', link: `/learn/course/${course.id}/overview` })
    if (certificateEligibility(d, e.id).ok) {
      const cert = newCertificate(d, e.id)
      d = { ...d, certificates: [...d.certificates, cert] }
      d = notify(d, [e.userId], { kind: 'certificate', title: 'Certificate issued', body: `Your certificate for ${course.title} is ready.`, link: `/learn/certificates/${cert.id}` })
    }
    return d
  }
  function newCertificate(d: AppData, enrollmentId: ID): Certificate {
    const e = d.enrollments.find((x) => x.id === enrollmentId)!
    const course = courseOf(d, e.courseId)!
    let code = certificateCode()
    while (d.certificates.some((c) => c.code === code)) code = certificateCode()
    return { id: uid('cert'), code, enrollmentId, userId: e.userId, courseId: course.id, issuedAt: now(), status: 'valid', revokedReason: '', studentName: nameOf(d, e.userId), courseTitle: course.title, instructorName: nameOf(d, course.instructorId), issuer: d.settings.certificate.issuer }
  }
  /** Completes a lesson inside a snapshot (used by lesson completion and passing quizzes). */
  function complete(d: AppData, e: Enrollment, lessonId: ID, minutes: number, kind: 'lesson' | 'quiz'): AppData {
    if (e.progress[lessonId]) return d
    const at = now()
    d = { ...d, enrollments: replace(d.enrollments, e.id, (x) => ({ ...x, progress: { ...x.progress, [lessonId]: at }, lastActivityAt: at, lastLessonId: lessonId })) }
    d = { ...d, events: [...d.events, { id: uid('ev'), userId: e.userId, courseId: e.courseId, lessonId, kind, minutes, at }] }
    return settleCompletion(d, e.id)
  }

  return {
    reset: () => commit(createSeed()),
    setCurrentUser: (id: ID) => commit({ ...get(), currentUserId: id }),

    // ——— Courses ———
    saveCourse(input: Course): Result {
      const d = get()
      const user = me()
      const existing = courseOf(d, input.id)
      if (existing ? !canEditCourse(user, existing) : !can(user, 'course.create')) return fail('You can only edit your own courses.')
      const c: Course = { ...input, title: input.title.trim(), shortDescription: input.shortDescription.trim(), slug: existing && existing.title === input.title.trim() ? existing.slug : slugify(input.title), objectives: input.objectives.map((o) => o.trim()).filter(Boolean), prerequisites: input.prerequisites.map((o) => o.trim()).filter(Boolean), tags: [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))], updatedAt: now() }
      if (user?.role === 'instructor') c.instructorId = existing?.instructorId ?? user.id
      const e = validateCourse(c, d)
      if (Object.keys(e).length) return errs(e)
      // A published course that loses its publishing requirements must be fixed first.
      if (c.status === 'published' || c.status === 'review') {
        const p = publishProblems(c, d.settings)
        if (p.length) return fail(`This course is ${c.status === 'published' ? 'published' : 'in review'}: ${p[0].toLowerCase()}, or unpublish it first.`, 'curriculum')
      }
      commit(audit({ ...d, courses: upsert(d.courses, c) }, `${existing ? 'Updated' : 'Created'} course ${c.title}`, `/admin/courses`, 'course'))
      return { ok: true, id: c.id }
    },
    /** draft → review/published → draft (unpublish) → archived → draft. */
    setCourseStatus(id: ID, to: CourseStatus): Result<CourseStatus> {
      let d = get()
      const user = me()
      const c = courseOf(d, id)
      if (!c) return fail('Course not found')
      if (!canEditCourse(user, c)) return fail('You can only change your own courses.')
      if (to === 'published' || to === 'review') {
        const p = publishProblems(c, d.settings)
        if (p.length) return fail(p.join('. ') + '.')
        if (to === 'published' && d.settings.publication.requireReview && !can(user, 'course.publish')) to = 'review'
      }
      if (to === c.status) return { ok: true, id: to }
      const at = now()
      d = { ...d, courses: replace(d.courses, id, (x) => ({ ...x, status: to, updatedAt: at, publishedAt: to === 'published' ? x.publishedAt ?? at : x.publishedAt })) }
      if (to === 'review') d = notify(d, admins(d), { kind: 'system', title: 'Course submitted for review', body: `${nameOf(d, c.instructorId)} submitted ${c.title}.`, link: '/admin/courses?status=review' })
      if (to === 'published' && c.instructorId !== user?.id) d = notify(d, [c.instructorId], { kind: 'system', title: `${c.title} is published`, body: 'It now appears in the catalog.', link: `/courses/${c.slug}` })
      const verb = { draft: c.status === 'published' ? 'Unpublished' : c.status === 'archived' ? 'Restored' : 'Returned to draft', review: 'Submitted for review', published: 'Published', archived: 'Archived' }[to]
      commit(audit(d, `${verb} course ${c.title}`, '/admin/courses', 'course'))
      return { ok: true, id: to }
    },
    duplicateCourse(id: ID): Result {
      const d = get()
      const c = courseOf(d, id)
      if (!c || !canEditCourse(me(), c)) return fail('You can only duplicate your own courses.')
      let title = `${c.title} (copy)`
      for (let n = 2; d.courses.some((x) => x.slug === slugify(title)); n++) title = `${c.title} (copy ${n})`
      const copy: Course = {
        ...structuredClone(c), id: uid('c'), title, slug: slugify(title), status: 'draft', publishedAt: null, createdAt: now(), updatedAt: now(),
        // Quizzes stay with the original course, so quiz lessons are converted to text placeholders.
        sections: c.sections.map((s) => ({ ...s, id: uid('s'), lessons: s.lessons.map((l) => ({ ...structuredClone(l), id: uid('l'), ...(l.type === 'quiz' ? { type: 'text' as const, quizId: null, body: 'Quiz lesson — attach a quiz for this course in the builder.' } : {}) })) })),
      }
      commit(audit({ ...d, courses: [...d.courses, copy] }, `Duplicated course ${c.title}`, '/admin/courses', 'course'))
      return { ok: true, id: copy.id }
    },
    /** Deleting is only allowed while nobody has enrolled; otherwise archive, so learner records survive. */
    deleteCourse(id: ID): Result {
      const d = get()
      const c = courseOf(d, id)
      if (!c || !canEditCourse(me(), c)) return fail('You can only delete your own courses.')
      const n = d.enrollments.filter((e) => e.courseId === id).length
      if (n) return fail(`${plural(n, 'enrollment')} reference this course. Archive it instead so learner records and certificates stay intact.`)
      const quizIds = new Set(d.quizzes.filter((q) => q.courseId === id).map((q) => q.id))
      const asIds = new Set(d.assignments.filter((a) => a.courseId === id).map((a) => a.id))
      commit(audit({
        ...d,
        courses: d.courses.filter((x) => x.id !== id),
        quizzes: d.quizzes.filter((q) => !quizIds.has(q.id)),
        attempts: d.attempts.filter((a) => !quizIds.has(a.quizId)),
        assignments: d.assignments.filter((a) => !asIds.has(a.id)),
        submissions: d.submissions.filter((s) => !asIds.has(s.assignmentId)),
        announcements: d.announcements.filter((a) => a.courseId !== id),
        reviews: d.reviews.filter((r) => r.courseId !== id),
        groups: d.groups.map((g) => ({ ...g, courseIds: g.courseIds.filter((x) => x !== id) })),
        bank: d.bank.map((q) => (q.courseId === id ? { ...q, courseId: null } : q)),
        website: { ...d.website, featuredCourseIds: d.website.featuredCourseIds.filter((x) => x !== id) },
      }, `Deleted course ${c.title}`, '/admin/courses', 'course'))
      return { ok: true, id }
    },

    // ——— Enrollment & progress ———
    enroll(userId: ID, courseId: ID): Result {
      let d = get()
      const user = me()
      const byStaff = can(user, 'enroll.manage')
      if (!byStaff && userId !== user?.id) return fail('You can only enroll yourself.')
      const course = courseOf(d, courseId)
      if (byStaff && user?.role === 'instructor' && course?.instructorId !== user.id) return fail('Instructors can enroll students in their own courses only.')
      const problem = enrollCheck(d, userId, courseId, { byStaff })
      if (problem) return fail(problem)
      const e: Enrollment = { id: uid('e'), userId, courseId, status: 'active', enrolledAt: now(), completedAt: null, lastActivityAt: null, lastLessonId: null, progress: {}, bookmarks: [], notes: {}, groupId: null }
      d = { ...d, enrollments: [...d.enrollments, e] }
      d = notify(d, [userId], { kind: 'enrollment', title: `Enrolled in ${course!.title}`, body: byStaff && userId !== user?.id ? `${user!.name} enrolled you.` : 'You can start the first lesson now.', link: `/learn/course/${courseId}/overview` })
      d = notify(d, [course!.instructorId], { kind: 'enrollment', title: 'New enrollment', body: `${nameOf(d, userId)} joined ${course!.title}.`, link: '/teach/students' })
      if (byStaff) d = audit(d, `Enrolled ${nameOf(d, userId)} in ${course!.title}`, '/admin/enrollments', 'enrollment')
      commit(d)
      return { ok: true, id: e.id }
    },
    setEnrollmentStatus(id: ID, status: EnrollmentStatus): Result {
      const d = get()
      const e = d.enrollments.find((x) => x.id === id)
      const course = e && courseOf(d, e.courseId)
      const user = me()
      if (!e || !course) return fail('Enrollment not found')
      const self = user?.id === e.userId && status === 'cancelled'
      if (!self && !(can(user, 'course.any') || (can(user, 'enroll.manage') && course.instructorId === user?.id))) return fail('You can’t change this enrollment.')
      if (e.status === 'completed' && status !== 'completed') return fail('Completed enrollments are part of the learner’s record and can’t be changed.')
      if (status === 'active' && d.enrollments.some((x) => x.id !== id && x.userId === e.userId && x.courseId === e.courseId && ['active', 'completed', 'suspended'].includes(x.status)))
        return fail('This student already has another enrollment in this course.')
      const verb = { active: 'Reactivated', suspended: 'Suspended', cancelled: 'Cancelled', completed: 'Completed' }[status]
      commit(audit({ ...d, enrollments: replace(d.enrollments, id, (x) => ({ ...x, status })) }, `${verb} ${nameOf(d, e.userId)}’s enrollment in ${course.title}`, '/admin/enrollments', 'enrollment'))
      // Reactivating may complete a course whose rules are already satisfied.
      if (status === 'active') commit(settleCompletion(get(), id))
      return { ok: true, id }
    },
    /** Records that a lesson was opened (resume point). */
    openLesson(enrollmentId: ID, lessonId: ID) {
      const d = get()
      const e = d.enrollments.find((x) => x.id === enrollmentId)
      if (!e || e.lastLessonId === lessonId) return
      commit({ ...d, enrollments: replace(d.enrollments, enrollmentId, (x) => ({ ...x, lastLessonId: lessonId, lastActivityAt: now() })) })
    },
    completeLesson(enrollmentId: ID, lessonId: ID): Result {
      const d = get()
      const e = d.enrollments.find((x) => x.id === enrollmentId)
      if (!e || e.userId !== d.currentUserId) return fail('Enrollment not found')
      if (e.status === 'suspended' || e.status === 'cancelled') return fail(`This enrollment is ${e.status}. Contact your instructor.`)
      const course = courseOf(d, e.courseId)
      const lesson = course && allLessons(course).find((l) => l.id === lessonId)
      if (!lesson) return fail('Lesson not found')
      if (e.progress[lessonId]) return { ok: true, id: lessonId }
      const check = canCompleteLesson(d, d.settings, lesson, e.userId)
      if (!check.ok) return fail(check.reason!)
      commit(complete(d, e, lessonId, lesson.durationMinutes, 'lesson'))
      return { ok: true, id: lessonId }
    },
    toggleBookmark(enrollmentId: ID, lessonId: ID) {
      const d = get()
      commit({ ...d, enrollments: replace(d.enrollments, enrollmentId, (x) => ({ ...x, bookmarks: x.bookmarks.includes(lessonId) ? x.bookmarks.filter((b) => b !== lessonId) : [...x.bookmarks, lessonId] })) })
    },
    saveNote(enrollmentId: ID, lessonId: ID, text: string): Result {
      if (text.length > 5000) return fail('Notes are limited to 5,000 characters', 'note')
      const d = get()
      commit({ ...d, enrollments: replace(d.enrollments, enrollmentId, (x) => ({ ...x, notes: { ...x.notes, [lessonId]: text } })) })
      return { ok: true, id: lessonId }
    },

    // ——— Quizzes ———
    saveQuiz(quiz: Quiz): Result {
      const d = get()
      const course = courseOf(d, quiz.courseId)
      if (!course) return fail('Choose a course', 'courseId')
      if (!can(me(), 'assess.manage') || !canEditCourse(me(), course)) return fail('You can only edit quizzes in your own courses.')
      const q = { ...quiz, title: quiz.title.trim(), updatedAt: now() }
      const e = validateQuiz(q, q.status === 'published')
      if (Object.keys(e).length) return errs(e)
      const had = d.quizzes.some((x) => x.id === q.id)
      commit(audit({ ...d, quizzes: upsert(d.quizzes, q) }, `${had ? 'Updated' : 'Created'} ${q.kind} ${q.title}`, `/admin/quizzes`, 'assessment'))
      return { ok: true, id: q.id }
    },
    deleteQuiz(id: ID): Result {
      const d = get()
      const q = d.quizzes.find((x) => x.id === id)
      if (!q) return fail('Quiz not found')
      const course = courseOf(d, q.courseId)
      if (!course || !canEditCourse(me(), course)) return fail('You can only delete quizzes in your own courses.')
      if (d.attempts.some((a) => a.quizId === id)) return fail('Students have attempted this quiz. Unpublish it instead so their results stay on record.')
      const lesson = allLessons(course).find((l) => l.quizId === id)
      if (lesson) return fail(`The lesson “${lesson.title}” uses this quiz. Change or remove that lesson first.`)
      commit(audit({ ...d, quizzes: d.quizzes.filter((x) => x.id !== id) }, `Deleted ${q.kind} ${q.title}`, '/admin/quizzes', 'assessment'))
      return { ok: true, id }
    },
    /** Starts a new attempt or returns the one already in progress. */
    startAttempt(quizId: ID): Result {
      const d = get()
      const quiz = d.quizzes.find((q) => q.id === quizId)
      if (!quiz) return fail('Quiz not found')
      const enrolled = d.enrollments.some((e) => e.userId === d.currentUserId && e.courseId === quiz.courseId && (e.status === 'active' || e.status === 'completed'))
      if (!enrolled) return fail('Enroll in the course to take this quiz.')
      const blocker = attemptBlocker(quiz, d.attempts, d.currentUserId, today())
      if (blocker) return fail(blocker)
      const open = d.attempts.find((a) => a.quizId === quizId && a.userId === d.currentUserId && a.status === 'in_progress')
      if (open) return { ok: true, id: open.id }
      const id = uid('att')
      commit({ ...d, attempts: [...d.attempts, { id, quizId, userId: d.currentUserId, startedAt: now(), submittedAt: null, answers: {}, manualPoints: {}, status: 'in_progress', score: 0, maxScore: 0, gradedById: null }] })
      return { ok: true, id }
    },
    saveAnswers(attemptId: ID, answers: Record<ID, string[]>) {
      const d = get()
      const a = d.attempts.find((x) => x.id === attemptId)
      if (!a || a.status !== 'in_progress') return
      commit({ ...d, attempts: replace(d.attempts, attemptId, (x) => ({ ...x, answers })) })
    },
    /** Grades and records the attempt. Only an in-progress attempt can be submitted, so a double click can't submit twice. */
    submitAttempt(attemptId: ID, answers: Record<ID, string[]>): Result {
      let d = get()
      const a = d.attempts.find((x) => x.id === attemptId)
      if (!a || a.userId !== d.currentUserId) return fail('Attempt not found')
      if (a.status !== 'in_progress') return fail('This attempt was already submitted.')
      const quiz = d.quizzes.find((q) => q.id === a.quizId)!
      for (const [qid, v] of Object.entries(answers)) if (v.some((x) => x.length > 2000)) return fail('Answers are limited to 2,000 characters', qid)
      const g = gradeAttempt(quiz, answers)
      const graded = { ...a, answers, submittedAt: now(), status: g.status, score: g.score, maxScore: g.maxScore }
      d = { ...d, attempts: replace(d.attempts, attemptId, () => graded) }
      const minutes = Math.max(1, Math.round((Date.now() - new Date(a.startedAt).getTime()) / 60_000))
      const ok = passed(quiz, graded)
      d = notify(d, [a.userId], g.status === 'pending_review'
        ? { kind: 'quiz', title: `Submitted: ${quiz.title}`, body: 'Some answers are graded by your instructor. You’ll be notified when your result is final.', link: `/learn/quizzes/${quiz.id}/attempts/${attemptId}` }
        : { kind: 'quiz', title: `${ok ? 'Passed' : 'Not passed'}: ${quiz.title}`, body: `You scored ${g.score}/${g.maxScore}.`, link: `/learn/quizzes/${quiz.id}/attempts/${attemptId}` })
      if (g.status === 'pending_review') d = notify(d, [courseOf(d, quiz.courseId)!.instructorId], { kind: 'feedback', title: 'Answers waiting for grading', body: `${nameOf(d, a.userId)} submitted ${quiz.title}.`, link: `/teach/grades` })
      d = afterQuiz(d, quiz.id, a.userId, minutes)
      commit(d)
      return { ok: true, id: attemptId }
    },
    /** Manual grading of written answers. */
    gradeAttempt(attemptId: ID, manualPoints: Record<ID, number>): Result {
      let d = get()
      const a = d.attempts.find((x) => x.id === attemptId)
      const quiz = a && d.quizzes.find((q) => q.id === a.quizId)
      const course = quiz && courseOf(d, quiz.courseId)
      if (!a || !quiz || !course) return fail('Attempt not found')
      if (!can(me(), 'assess.grade') || !canEditCourse(me(), course)) return fail('Only the course instructor or an administrator can grade this.')
      if (a.status === 'in_progress') return fail('The student hasn’t submitted this attempt yet.')
      for (const q of quiz.questions) if (manualPoints[q.id] !== undefined && !(manualPoints[q.id] >= 0 && manualPoints[q.id] <= q.points)) return fail(`Points must be between 0 and ${q.points}`, q.id)
      const g = gradeAttempt(quiz, a.answers, manualPoints)
      if (g.pending) return fail('Grade every written answer before saving.')
      d = { ...d, attempts: replace(d.attempts, attemptId, (x) => ({ ...x, manualPoints, status: g.status, score: g.score, gradedById: d.currentUserId })) }
      d = notify(d, [a.userId], { kind: 'quiz', title: `Result ready: ${quiz.title}`, body: `You scored ${g.score}/${g.maxScore}.`, link: `/learn/quizzes/${quiz.id}/attempts/${attemptId}` })
      d = afterQuiz(d, quiz.id, a.userId, 0)
      commit(audit(d, `Graded ${quiz.title} for ${nameOf(d, a.userId)}`, '/admin/grades', 'assessment'))
      return { ok: true, id: attemptId }
    },

    // ——— Question bank ———
    saveBankQuestion(q: BankQuestion): Result {
      const d = get()
      if (!can(me(), 'assess.manage')) return fail('Your role can’t edit the question bank.')
      const problem = questionProblem(q)
      if (problem) return fail(`Question: ${problem}`, 'text')
      const had = d.bank.some((x) => x.id === q.id)
      commit({ ...d, bank: upsert(d.bank, { ...q, text: q.text.trim(), updatedAt: now() }) })
      return { ok: true, id: had ? q.id : q.id }
    },
    deleteBankQuestion(id: ID): Result {
      const d = get()
      if (!can(me(), 'assess.manage')) return fail('Your role can’t edit the question bank.')
      // Quizzes hold their own copies, so deleting from the bank never changes a quiz.
      commit({ ...d, bank: d.bank.filter((q) => q.id !== id), quizzes: d.quizzes.map((z) => ({ ...z, questions: z.questions.map((x) => (x.sourceId === id ? { ...x, sourceId: null } : x)) })) })
      return { ok: true, id }
    },
    importBank(items: BankQuestion[]): Result<number> {
      const d = get()
      if (!can(me(), 'assess.manage')) return fail('Your role can’t edit the question bank.')
      const bad = items.findIndex((q) => questionProblem(q))
      if (bad >= 0) return fail(`Row ${bad + 1}: ${questionProblem(items[bad])}`)
      commit({ ...d, bank: [...d.bank, ...items] })
      return { ok: true, id: items.length }
    },

    // ——— Assignments ———
    saveAssignment(a: Assignment): Result {
      const d = get()
      const course = courseOf(d, a.courseId)
      if (!course) return fail('Choose a course', 'courseId')
      if (!canEditCourse(me(), course)) return fail('You can only edit assignments in your own courses.')
      const e: Record<string, string> = {}
      if (!a.title.trim()) e.title = 'Give the assignment a title'
      if (!a.instructions.trim()) e.instructions = 'Add instructions so students know what to submit'
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.dueDate)) e.dueDate = 'Choose a due date'
      if (!(Number.isInteger(a.maxPoints) && a.maxPoints >= 1 && a.maxPoints <= 1000)) e.maxPoints = 'Maximum points must be a whole number from 1 to 1,000'
      if (Object.keys(e).length) return errs(e)
      const had = d.assignments.some((x) => x.id === a.id)
      let next: AppData = { ...d, assignments: upsert(d.assignments, { ...a, title: a.title.trim() }) }
      if (a.status === 'assigned' && d.assignments.find((x) => x.id === a.id)?.status !== 'assigned') {
        const students = d.enrollments.filter((x) => x.courseId === a.courseId && x.status === 'active').map((x) => x.userId)
        next = notify(next, students, { kind: 'deadline', title: `New assignment: ${a.title}`, body: `Due ${a.dueDate} in ${course.title}.`, link: `/learn/assignments/${a.id}` })
      }
      commit(audit(next, `${had ? 'Updated' : 'Created'} assignment ${a.title}`, '/admin/assignments', 'assessment'))
      return { ok: true, id: a.id }
    },
    deleteAssignment(id: ID): Result {
      const d = get()
      const a = d.assignments.find((x) => x.id === id)
      const course = a && courseOf(d, a.courseId)
      if (!a || !course || !canEditCourse(me(), course)) return fail('You can only delete assignments in your own courses.')
      if (d.submissions.some((s) => s.assignmentId === id)) return fail('Students have submitted work. Close the assignment instead so their submissions and grades are kept.')
      commit({ ...d, assignments: d.assignments.filter((x) => x.id !== id) })
      return { ok: true, id }
    },
    submitAssignment(assignmentId: ID, input: Pick<Submission, 'text' | 'attachments'>): Result {
      let d = get()
      const a = d.assignments.find((x) => x.id === assignmentId)
      if (!a || a.status === 'draft') return fail('Assignment not found')
      if (a.status === 'closed') return fail('This assignment is closed.')
      if (!d.enrollments.some((e) => e.userId === d.currentUserId && e.courseId === a.courseId && e.status === 'active')) return fail('You need an active enrollment in this course to submit.')
      const text = input.text.trim()
      if (!text && !input.attachments.length) return fail('Write a response or attach a file', 'text')
      if (text.length > 20000) return fail('Responses are limited to 20,000 characters', 'text')
      if (input.attachments.length > 5) return fail('Attach up to 5 files', 'attachments')
      const existing = d.submissions.find((s) => s.assignmentId === assignmentId && s.userId === d.currentUserId)
      if (existing && existing.status !== 'returned') return fail(existing.status === 'graded' ? 'This assignment has been graded.' : 'You’ve already submitted. Your instructor can return it if you need to revise.')
      const late = today() > a.dueDate
      if (late && !(a.allowLate && d.settings.learning.allowLateSubmissions)) return fail('The due date has passed and this assignment doesn’t accept late work.')
      const sub: Submission = { id: existing?.id ?? uid('sub'), assignmentId, userId: d.currentUserId, text, attachments: input.attachments, submittedAt: now(), status: late ? 'late' : 'submitted', grade: null, feedback: existing?.feedback ?? '', gradedAt: null }
      d = { ...d, submissions: upsert(d.submissions, sub), events: [...d.events, { id: uid('ev'), userId: d.currentUserId, courseId: a.courseId, lessonId: null, kind: 'assignment', minutes: 30, at: now() }] }
      d = notify(d, [courseOf(d, a.courseId)!.instructorId], { kind: 'feedback', title: 'New submission', body: `${nameOf(d, d.currentUserId)} submitted ${a.title}${late ? ' (late)' : ''}.`, link: `/teach/assignments/${a.id}` })
      commit(d)
      return { ok: true, id: sub.id }
    },
    gradeSubmission(id: ID, grade: number, feedback: string, returnForRevision = false): Result {
      let d = get()
      const s = d.submissions.find((x) => x.id === id)
      const a = s && d.assignments.find((x) => x.id === s.assignmentId)
      const course = a && courseOf(d, a.courseId)
      if (!s || !a || !course) return fail('Submission not found')
      if (!can(me(), 'assess.grade') || !canEditCourse(me(), course)) return fail('Only the course instructor or an administrator can grade this.')
      if (!returnForRevision && !(Number.isFinite(grade) && grade >= 0 && grade <= a.maxPoints)) return fail(`Enter a grade from 0 to ${a.maxPoints}`, 'grade')
      if (returnForRevision && !feedback.trim()) return fail('Explain what to revise', 'feedback')
      d = { ...d, submissions: replace(d.submissions, id, (x) => ({ ...x, grade: returnForRevision ? null : grade, feedback: feedback.trim(), status: returnForRevision ? 'returned' : 'graded', gradedAt: now() })) }
      d = notify(d, [s.userId], { kind: 'feedback', title: returnForRevision ? `Returned for revision: ${a.title}` : `${a.title} graded`, body: returnForRevision ? 'Read the feedback and resubmit.' : `You scored ${grade}/${a.maxPoints}.`, link: `/learn/assignments/${a.id}` })
      commit(audit(d, `${returnForRevision ? 'Returned' : 'Graded'} ${a.title} for ${nameOf(d, s.userId)}`, '/admin/grades', 'assessment'))
      return { ok: true, id }
    },

    // ——— Certificates ———
    issueCertificate(enrollmentId: ID): Result {
      const d = get()
      if (!can(me(), 'certificates.manage')) return fail('Only administrators can issue certificates.')
      const check = certificateEligibility(d, enrollmentId)
      if (!check.ok) return fail(check.reason)
      const cert = newCertificate(d, enrollmentId)
      commit(audit(notify({ ...d, certificates: [...d.certificates, cert] }, [cert.userId], { kind: 'certificate', title: 'Certificate issued', body: `Your certificate for ${cert.courseTitle} is ready.`, link: `/learn/certificates/${cert.id}` }), `Issued certificate ${cert.code}`, '/admin/certificates', 'certificate'))
      return { ok: true, id: cert.id }
    },
    setCertificateStatus(id: ID, status: Certificate['status'], reason = ''): Result {
      const d = get()
      if (!can(me(), 'certificates.manage')) return fail('Only administrators can revoke certificates.')
      const c = d.certificates.find((x) => x.id === id)
      if (!c) return fail('Certificate not found')
      if (status === 'revoked' && !reason.trim()) return fail('Give a reason — it is shown on the verification page', 'reason')
      commit(audit({ ...d, certificates: replace(d.certificates, id, (x) => ({ ...x, status, revokedReason: status === 'revoked' ? reason.trim() : '' })) }, `${status === 'revoked' ? 'Revoked' : 'Reinstated'} certificate ${c.code}`, '/admin/certificates', 'certificate'))
      return { ok: true, id }
    },

    // ——— People ———
    saveUser(input: User): Result {
      const d = get()
      const self = input.id === d.currentUserId
      if (!self && !can(me(), 'users.manage')) return fail('Only administrators can edit other accounts.')
      const u = { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), title: input.title.trim() }
      const e: Record<string, string> = {}
      if (u.name.length < 2) e.name = 'Enter a name'
      if (!isEmail(u.email)) e.email = 'Enter a valid email address'
      else if (d.users.some((x) => x.id !== u.id && x.email === u.email)) e.email = 'Another account already uses this email'
      if (u.bio.length > 1000) e.bio = 'Keep the biography under 1,000 characters'
      if (u.links.some((l) => l.url && !/^https?:\/\//.test(l.url))) e.links = 'Links must start with http:// or https://'
      if (!(u.weeklyGoalMinutes >= 0 && u.weeklyGoalMinutes <= 3000)) e.weeklyGoalMinutes = 'Weekly goal must be between 0 and 3,000 minutes'
      const before = d.users.find((x) => x.id === u.id)
      if (before && self && (before.role !== u.role || !u.active) && !can(me(), 'users.manage')) return fail('You can’t change your own role or status.')
      if (self && !u.active) e.active = 'You can’t deactivate the account you’re using'
      if (before?.role === 'admin' && (u.role !== 'admin' || !u.active) && admins(d).filter((x) => x !== u.id).length === 0) e.role = 'Keep at least one active administrator'
      const owned = d.courses.filter((c) => c.instructorId === u.id).length
      if (before?.role === 'instructor' && u.role !== 'instructor' && owned) e.role = `${u.name} teaches ${plural(owned, 'course')}. Reassign them before changing the role.`
      if (Object.keys(e).length) return errs(e)
      let next: AppData = { ...d, users: upsert(d.users, u) }
      if (!before) next = audit(next, `Created ${u.role} account for ${u.name}`, `/admin/users/${u.id}`, 'people')
      else if (before.role !== u.role) next = audit(next, `Changed ${u.name}’s role from ${before.role} to ${u.role}`, `/admin/users/${u.id}`, 'people')
      else if (before.active !== u.active) next = audit(next, `${u.active ? 'Activated' : 'Deactivated'} ${u.name}`, `/admin/users/${u.id}`, 'people')
      commit(next)
      return { ok: true, id: u.id }
    },
    reassignCourses(fromId: ID, toId: ID): Result<number> {
      const d = get()
      if (!can(me(), 'users.manage')) return fail('Only administrators can reassign courses.')
      const to = d.users.find((u) => u.id === toId)
      if (!to || to.role !== 'instructor') return fail('Choose an instructor')
      const n = d.courses.filter((c) => c.instructorId === fromId).length
      commit(audit({ ...d, courses: d.courses.map((c) => (c.instructorId === fromId ? { ...c, instructorId: toId } : c)) }, `Reassigned ${plural(n, 'course')} to ${to.name}`, '/admin/courses', 'course'))
      return { ok: true, id: n }
    },

    // ——— Academic structure ———
    saveYear: (y: AcademicYear) => saveSimple('academicYears', y, () => {
      if (!y.name.trim()) return { name: 'Enter a name, e.g. 2026–27' }
      if (!y.start || !y.end || y.end <= y.start) return { end: 'The end date must be after the start date' }
      if (get().academicYears.some((x) => x.id !== y.id && x.name.trim().toLowerCase() === y.name.trim().toLowerCase())) return { name: 'An academic year with this name exists' }
      return {}
    }, `academic year ${y.name}`, '/admin/academic-years'),
    saveTerm: (t: Term) => saveSimple('terms', t, () => {
      const d = get()
      const year = d.academicYears.find((y) => y.id === t.yearId)
      if (!t.name.trim()) return { name: 'Enter a name' }
      if (!year) return { yearId: 'Choose an academic year' }
      if (!t.start || !t.end || t.end <= t.start) return { end: 'The end date must be after the start date' }
      if (t.start < year.start || t.end > year.end) return { start: `Dates must fall within ${year.name} (${year.start} to ${year.end})` }
      if (d.terms.some((x) => x.id !== t.id && x.yearId === t.yearId && x.name.trim().toLowerCase() === t.name.trim().toLowerCase())) return { name: 'This year already has a term with this name' }
      return {}
    }, `term ${t.name}`, '/admin/terms'),
    saveFaculty: (f: Faculty) => saveSimple('faculties', f, () => (f.name.trim() ? (get().faculties.some((x) => x.id !== f.id && x.name.trim().toLowerCase() === f.name.trim().toLowerCase()) ? { name: 'A faculty with this name exists' } : {}) : { name: 'Enter a name' }), `faculty ${f.name}`, '/admin/faculties'),
    saveDepartment: (dep: Department) => saveSimple('departments', { ...dep, code: dep.code.trim().toUpperCase() }, () => {
      if (!dep.name.trim()) return { name: 'Enter a name' }
      if (!/^[A-Za-z]{2,6}$/.test(dep.code.trim())) return { code: 'Use 2–6 letters, e.g. CS' }
      if (get().departments.some((x) => x.id !== dep.id && x.code.toUpperCase() === dep.code.trim().toUpperCase())) return { code: 'Another department uses this code' }
      return {}
    }, `department ${dep.name}`, '/admin/departments'),
    saveSubjectCategory: (c: SubjectCategory) => saveSimple('subjectCategories', c, () => (c.name.trim() ? {} : { name: 'Enter a name' }), `subject category ${c.name}`, '/admin/subject-categories'),
    saveCategory: (c: Category) => saveSimple('categories', c, () => {
      if (!c.name.trim()) return { name: 'Enter a name' }
      if (get().categories.some((x) => x.id !== c.id && x.name.trim().toLowerCase() === c.name.trim().toLowerCase())) return { name: 'A category with this name exists' }
      if (!(c.hue >= 0 && c.hue <= 360)) return { hue: 'Hue must be between 0 and 360' }
      return {}
    }, `category ${c.name}`, '/admin/categories'),
    saveGroup: (g: StudentGroup) => saveSimple('groups', g, () => (g.name.trim() ? {} : { name: 'Enter a name' }), `${g.kind} ${g.name}`, '/admin/groups'),

    /** Deletes an academic record only when nothing references it. */
    deleteRecord(kind: 'academicYears' | 'terms' | 'faculties' | 'departments' | 'subjectCategories' | 'categories' | 'groups', id: ID): Result {
      const d = get()
      if (!can(me(), 'academic.manage')) return fail('Only administrators can change the academic structure.')
      const uses: Record<typeof kind, () => string | null> = {
        academicYears: () => count([['term', d.terms.filter((t) => t.yearId === id).length], ['subject', d.subjects.filter((s) => s.yearId === id).length], ['group', d.groups.filter((g) => g.yearId === id).length]]),
        terms: () => count([['course', d.courses.filter((c) => c.termId === id).length], ['subject', d.subjects.filter((s) => s.termId === id).length]]),
        faculties: () => count([['department', d.departments.filter((x) => x.facultyId === id).length]]),
        departments: () => count([['subject', d.subjects.filter((s) => s.departmentId === id).length], ['staff member', d.users.filter((u) => u.departmentId === id).length]]),
        subjectCategories: () => count([['subject', d.subjects.filter((s) => s.categoryId === id).length]]),
        categories: () => count([['course', d.courses.filter((c) => c.categoryId === id).length]]),
        groups: () => null,
      }
      const used = uses[kind]()
      if (used) return fail(`Still used by ${used}. Reassign or archive those first — deleting would break historical records.`)
      const list = d[kind] as { id: ID; name: string }[]
      const rec = list.find((x) => x.id === id)
      let next = { ...d, [kind]: list.filter((x) => x.id !== id) } as AppData
      if (kind === 'categories') next = { ...next, website: { ...next.website, visibleCategoryIds: next.website.visibleCategoryIds.filter((x) => x !== id) } }
      commit(audit(next, `Deleted ${rec?.name ?? 'record'}`, '/admin', 'academic'))
      return { ok: true, id }
    },
    /** Archives a year and its terms; history stays intact. */
    setPeriodStatus(kind: 'academicYears' | 'terms', id: ID, status: AcademicYear['status']): Result {
      const d = get()
      if (!can(me(), 'academic.manage')) return fail('Only administrators can change the academic structure.')
      let next: AppData = { ...d, [kind]: replace(d[kind] as AcademicYear[], id, (x) => ({ ...x, status })) }
      if (kind === 'academicYears' && status === 'archived') next = { ...next, terms: next.terms.map((t) => (t.yearId === id ? { ...t, status: 'archived' } : t)) }
      const rec = (d[kind] as AcademicYear[]).find((x) => x.id === id)
      commit(audit(next, `${status === 'archived' ? 'Archived' : status === 'active' ? 'Activated' : 'Set as upcoming'} ${rec?.name}`, `/admin/${kind === 'terms' ? 'terms' : 'academic-years'}`, 'academic'))
      return { ok: true, id }
    },

    saveSubject(s: Subject): Result {
      const d = get()
      if (!can(me(), 'academic.manage')) return fail('Only administrators can manage subjects.')
      const sub = { ...s, name: s.name.trim(), code: s.code.trim().toUpperCase(), updatedAt: now() }
      const e: Record<string, string> = {}
      if (sub.name.length < 2) e.name = 'Enter a subject name'
      if (!/^[A-Z]{2,6}\d{2,4}[A-Z]?$/.test(sub.code)) e.code = 'Use a code like CS101 or MATH140'
      // Codes are unique within an academic year; subjects without a year share one global scope.
      else if (d.subjects.some((x) => x.id !== sub.id && x.code === sub.code && x.yearId === sub.yearId)) e.code = `${sub.code} is already used ${sub.yearId ? 'in this academic year' : 'by another subject'}`
      if (sub.shortDescription.length > 200) e.shortDescription = 'Keep the short description under 200 characters'
      if (sub.termId && !d.terms.some((t) => t.id === sub.termId && t.yearId === sub.yearId)) e.termId = 'Choose a term in the selected academic year'
      if (sub.instructorIds.some((id) => d.users.find((u) => u.id === id)?.role !== 'instructor')) e.instructorIds = 'Only instructors can be assigned'
      if (Object.keys(e).length) return errs(e)
      const had = d.subjects.some((x) => x.id === sub.id)
      commit(audit({ ...d, subjects: upsert(d.subjects, sub) }, `${had ? 'Updated' : 'Created'} subject ${sub.name} (${sub.code})`, `/admin/subjects/${sub.id}`, 'academic'))
      return { ok: true, id: sub.id }
    },
    setSubjectStatus(ids: ID[], status: Subject['status']): Result<number> {
      const d = get()
      if (!can(me(), 'academic.manage')) return fail('Only administrators can manage subjects.')
      const set = new Set(ids)
      commit(audit({ ...d, subjects: d.subjects.map((s) => (set.has(s.id) ? { ...s, status, updatedAt: now() } : s)) }, `${status === 'archived' ? 'Archived' : status === 'active' ? 'Restored' : 'Moved to draft'} ${plural(ids.length, 'subject')}`, '/admin/subjects', 'academic'))
      return { ok: true, id: ids.length }
    },
    /** Deletes subjects with no courses, questions or history. Others are reported back untouched. */
    deleteSubjects(ids: ID[]): Result<number> {
      const d = get()
      if (!can(me(), 'academic.manage')) return fail('Only administrators can manage subjects.')
      const blocked = ids.filter((id) => d.courses.some((c) => c.subjectId === id) || d.bank.some((q) => q.subjectId === id))
      if (blocked.length) {
        const s = d.subjects.find((x) => x.id === blocked[0])!
        const nc = d.courses.filter((c) => c.subjectId === s.id).length
        return fail(`${s.name} has ${plural(nc, 'course')} and assessment history. Archive it, or move its courses to another subject first.`)
      }
      const set = new Set(ids)
      commit(audit({ ...d, subjects: d.subjects.filter((s) => !set.has(s.id)) }, `Deleted ${plural(ids.length, 'subject')}`, '/admin/subjects', 'academic'))
      return { ok: true, id: ids.length }
    },
    reassignSubjectCourses(fromId: ID, toId: ID | null): Result<number> {
      const d = get()
      if (!can(me(), 'academic.manage')) return fail('Only administrators can manage subjects.')
      const to = toId ? d.subjects.find((s) => s.id === toId) : null
      if (toId && !to) return fail('Choose a subject')
      const n = d.courses.filter((c) => c.subjectId === fromId).length
      commit(audit({ ...d, courses: d.courses.map((c) => (c.subjectId === fromId ? { ...c, subjectId: toId } : c)), bank: d.bank.map((q) => (q.subjectId === fromId ? { ...q, subjectId: toId } : q)) }, `Moved ${plural(n, 'course')} to ${to?.name ?? 'no subject'}`, '/admin/subjects', 'academic'))
      return { ok: true, id: n }
    },

    // ——— Communication ———
    saveAnnouncement(a: Announcement): Result {
      let d = get()
      const course = courseOf(d, a.courseId)
      if (!course) return fail('Choose a course', 'courseId')
      if (!can(me(), 'announce') || !canEditCourse(me(), course)) return fail('You can only post in your own courses.')
      if (!a.title.trim()) return fail('Add a title', 'title')
      if (!a.body.trim()) return fail('Write the announcement', 'body')
      const had = d.announcements.some((x) => x.id === a.id)
      d = { ...d, announcements: upsert(d.announcements, { ...a, title: a.title.trim(), body: a.body.trim() }) }
      if (!had) {
        const students = d.enrollments.filter((e) => e.courseId === a.courseId && (e.status === 'active' || e.status === 'completed')).map((e) => e.userId)
        d = notify(d, students, { kind: 'announcement', title: a.title.trim(), body: `${nameOf(d, a.authorId)} posted in ${course.title}.`, link: `/learn/course/${course.id}/overview` })
      }
      commit(d)
      return { ok: true, id: a.id }
    },
    addComment(courseId: ID, lessonId: ID, body: string, parentId: ID | null = null): Result {
      const d = get()
      const course = courseOf(d, courseId)
      if (!course) return fail('Course not found')
      const enrolled = d.enrollments.some((e) => e.userId === d.currentUserId && e.courseId === courseId && (e.status === 'active' || e.status === 'completed'))
      if (!enrolled && !canEditCourse(me(), course)) return fail('Enroll in the course to join the discussion.')
      const text = body.trim()
      if (text.length < 2) return fail('Write a question or reply', 'body')
      if (text.length > 3000) return fail('Keep posts under 3,000 characters', 'body')
      let next: AppData = { ...d, comments: [...d.comments, { id: uid('cm'), courseId, lessonId, userId: d.currentUserId, parentId, body: text, createdAt: now() }] }
      const parent = parentId && d.comments.find((c) => c.id === parentId)
      if (parent && parent.userId !== d.currentUserId) next = notify(next, [parent.userId], { kind: 'feedback', title: 'New reply to your question', body: `${nameOf(d, d.currentUserId)} replied in ${course.title}.`, link: `/learn/course/${courseId}/${lessonId}` })
      else if (!parentId && course.instructorId !== d.currentUserId) next = notify(next, [course.instructorId], { kind: 'feedback', title: 'New question', body: `${nameOf(d, d.currentUserId)} asked a question in ${course.title}.`, link: `/learn/course/${courseId}/${lessonId}` })
      commit(next)
      return { ok: true, id: lessonId }
    },
    deleteComment(id: ID): Result {
      const d = get()
      const c = d.comments.find((x) => x.id === id)
      const course = c && courseOf(d, c.courseId)
      if (!c || !course) return fail('Post not found')
      if (c.userId !== d.currentUserId && !canEditCourse(me(), course)) return fail('You can only delete your own posts.')
      commit({ ...d, comments: d.comments.filter((x) => x.id !== id && x.parentId !== id) })
      return { ok: true, id }
    },
    deleteAnnouncement(id: ID): Result {
      const d = get()
      const a = d.announcements.find((x) => x.id === id)
      const course = a && courseOf(d, a.courseId)
      if (!a || !course || !canEditCourse(me(), course)) return fail('You can only delete announcements in your own courses.')
      commit({ ...d, announcements: d.announcements.filter((x) => x.id !== id) })
      return { ok: true, id }
    },
    saveReview(courseId: ID, rating: number, body: string): Result {
      const d = get()
      const e = d.enrollments.find((x) => x.userId === d.currentUserId && x.courseId === courseId && (x.status === 'active' || x.status === 'completed'))
      if (!e) return fail('Enroll in the course to review it.')
      if (!(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return fail('Choose a rating from 1 to 5', 'rating')
      if (body.trim().length < 10) return fail('Write at least a sentence', 'body')
      const existing = d.reviews.find((r) => r.userId === d.currentUserId && r.courseId === courseId)
      const review: Review = { id: existing?.id ?? uid('rv'), courseId, userId: d.currentUserId, rating, body: body.trim().slice(0, 2000), status: existing?.status ?? 'published', createdAt: now() }
      commit({ ...d, reviews: upsert(d.reviews, review) })
      return { ok: true, id: review.id }
    },
    setReviewStatus(id: ID, status: Review['status'] | 'deleted'): Result {
      const d = get()
      if (!can(me(), 'platform.manage')) return fail('Only administrators can moderate reviews.')
      commit(audit({ ...d, reviews: status === 'deleted' ? d.reviews.filter((r) => r.id !== id) : replace(d.reviews, id, (r) => ({ ...r, status })) }, `${status === 'deleted' ? 'Deleted' : status === 'hidden' ? 'Hid' : 'Published'} a course review`, '/admin/reviews', 'platform'))
      return { ok: true, id }
    },
    readNotifications(ids: ID[] | 'all') {
      const d = get()
      commit({ ...d, notifications: d.notifications.map((n) => (n.userId === d.currentUserId && (ids === 'all' || ids.includes(n.id)) ? { ...n, read: true } : n)) })
    },
    deleteNotification(id: ID) {
      const d = get()
      commit({ ...d, notifications: d.notifications.filter((n) => n.id !== id) })
    },

    // ——— Platform ———
    updateSettings(patch: Partial<PlatformSettings>): Result {
      const d = get()
      if (!can(me(), 'platform.manage')) return fail('Only administrators can change platform settings.')
      const s = { ...d.settings, ...patch }
      if (!s.name.trim()) return fail('Enter the platform name', 'name')
      if (s.supportEmail && !isEmail(s.supportEmail)) return fail('Enter a valid email address', 'supportEmail')
      if (!s.certificate.issuer.trim()) return fail('Enter the issuing organization', 'issuer')
      if (!(s.publication.minLessons >= 1 && s.publication.minLessons <= 50)) return fail('Minimum lessons must be between 1 and 50', 'minLessons')
      if (!(s.learning.defaultWeeklyGoal >= 0 && s.learning.defaultWeeklyGoal <= 3000)) return fail('Weekly goal must be between 0 and 3,000 minutes', 'defaultWeeklyGoal')
      commit(audit({ ...d, settings: { ...s, name: s.name.trim() } }, 'Updated platform settings', '/admin/settings', 'platform'))
      return { ok: true, id: 'settings' }
    },
    saveTheme(theme: Theme): Result {
      const d = get()
      if (!can(me(), 'platform.manage')) return fail('Only administrators can change the theme.')
      commit(audit({ ...d, theme: sanitizeTheme(theme) }, 'Saved theme', '/admin/theme', 'platform'))
      return { ok: true, id: 'theme' }
    },
    saveWebsite(w: WebsiteConfig): Result {
      const d = get()
      if (!can(me(), 'platform.manage')) return fail('Only administrators can edit the website.')
      if (!w.headline.trim()) return fail('Enter a headline', 'headline')
      if (w.headline.length > 120) return fail('Keep the headline under 120 characters', 'headline')
      if (!w.ctaText.trim()) return fail('Enter the button text', 'ctaText')
      if (w.nav.some((n) => n.visible && !n.label.trim())) return fail('Visible menu items need a label', 'nav')
      if (w.testimonials.some((t) => !t.name.trim() || !t.quote.trim())) return fail('Each testimonial needs a name and a quote', 'testimonials')
      if (w.faq.some((f) => !f.q.trim() || !f.a.trim())) return fail('Each question needs an answer', 'faq')
      commit(audit({ ...d, website: w }, 'Updated website appearance', '/admin/website', 'platform'))
      return { ok: true, id: 'website' }
    },
  }

  function count(parts: [string, number][]) {
    const used = parts.filter(([, n]) => n > 0).map(([w, n]) => plural(n, w))
    return used.length ? used.join(' and ') : null
  }

  function saveSimple<K extends 'academicYears' | 'terms' | 'faculties' | 'departments' | 'subjectCategories' | 'categories' | 'groups'>(kind: K, rec: AppData[K][number], validate: () => Record<string, string | undefined>, label: string, link: string): Result {
    const d = get()
    if (!can(me(), 'academic.manage')) return fail('Only administrators can change the academic structure.')
    const e = Object.fromEntries(Object.entries(validate()).filter(([, v]) => v)) as Record<string, string>
    if (Object.keys(e).length) return errs(e)
    const list = d[kind] as { id: ID; name: string }[]
    const had = list.some((x) => x.id === rec.id)
    commit(audit({ ...d, [kind]: upsert(list, { ...rec, name: (rec as { name: string }).name.trim() }) } as AppData, `${had ? 'Updated' : 'Created'} ${label.trim()}`, link, kind === 'groups' ? 'people' : 'academic'))
    return { ok: true, id: rec.id }
  }

  /** After a graded attempt: completes the linked quiz lesson when the rules allow it. */
  function afterQuiz(d: AppData, quizId: ID, userId: ID, minutes: number): AppData {
    const quiz = d.quizzes.find((q) => q.id === quizId)!
    const course = courseOf(d, quiz.courseId)
    const e = d.enrollments.find((x) => x.userId === userId && x.courseId === quiz.courseId && x.status === 'active')
    if (!course || !e) return d
    for (const lesson of allLessons(course).filter((l) => l.quizId === quizId)) {
      const fresh = d.enrollments.find((x) => x.id === e.id)!
      // Minutes are recorded once, by the attempt itself.
      if (canCompleteLesson(d, d.settings, lesson, userId).ok) d = complete(d, fresh, lesson.id, 0, 'quiz')
    }
    if (minutes) d = { ...d, enrollments: replace(d.enrollments, e.id, (x) => ({ ...x, lastActivityAt: now() })), events: [...d.events, { id: uid('ev'), userId, courseId: quiz.courseId, lessonId: null, kind: 'quiz', minutes, at: now() }] }
    return d
  }
}

export type Actions = ReturnType<typeof createActions>
export { isSafeUrl }
