import type { AppData, Assignment, BankQuestion, Certificate, Course, DateString, Enrollment, ID, LearningEvent, Lesson, Notification, Question, Quiz, QuizAttempt, Review, StudentGroup, Submission, User } from '@/types'
import { addDays, parseDate, today as todayFn } from '@/lib/date'
import { DEFAULT_THEME } from '@/services/theme'
import { gradeAttempt } from '@/services/assessment'
import { certificateCode, requiredLessons } from '@/services/learning'
import { CATEGORIES, COURSES, EXTRA_BANK, QUIZZES, REVIEW_TEXT, SUBJECTS } from './content'

// Builds the demo data set. Deterministic for a given date, and every record
// is relative to "today" so deadlines, streaks and charts always look current.
// Progress, attempts, certificates and activity are generated together so
// they agree with each other everywhere in the app.

export const DATA_VERSION = 4

/** Small seeded PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const notifyAll = { enrollment: true, completion: true, deadline: true, quiz: true, announcement: true, feedback: true, certificate: true, system: true }

const FIRST = ['Liam', 'Sofia', 'Noah', 'Aisha', 'Mateo', 'Chloe', 'Kwame', 'Elena', 'Yusuf', 'Hana', 'Oliver', 'Zara', 'Lucas', 'Ines', 'Arjun', 'Freya', 'Diego', 'Nadia', 'Ethan', 'Leila', 'Kenji', 'Amelia', 'Omar', 'Ruby', 'Tariq', 'Isla', 'Felix', 'Maya', 'Samir', 'Clara', 'Jonah', 'Priyanka', 'Theo', 'Anya', 'Malik', 'Grace', 'Rafael', 'Lena', 'Dev']
const LAST = ['Thompson', 'García', 'Mensah', 'Rossi', 'Kowalski', 'Nakamura', 'Haddad', 'Johansson', 'Silva', 'Murphy', 'Ibrahim', 'Novak', 'Dubois', 'Fernández', 'Okonkwo', 'Larsen', 'Chen', 'Kaur', 'Bauer', 'Costa', 'Ahmed', 'Walsh', 'Tanaka', 'Moreau', 'Patel', 'Schmidt', 'Hughes', 'Romero', 'Lindgren', 'Adeyemi', 'Kim', 'Brennan', 'Vargas', 'Popescu', 'Osei', 'Sato', 'Hall', 'Reyes', 'Eriksen']
const COLORS = ['#3d41d6', '#0d7f89', '#b04d9a', '#c9790f', '#22804f', '#4f86c6', '#8a4fd0', '#c4417f', '#5f7f51', '#2d4a6b']
const INTERESTS = ['Data analysis', 'Web development', 'Design', 'Statistics', 'Biology', 'Marketing', 'Finance', 'Writing', 'Machine learning', 'Project management']

export function createSeed(T: DateString = todayFn()): AppData {
  const r = rng(20261020)
  const pick = <X,>(xs: readonly X[]) => xs[Math.floor(r() * xs.length)]
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
  const iso = (dayOffset: number, hour = 10, minute = 0) => {
    const d = parseDate(addDays(T, dayOffset))
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  /** Day offset from today for an ISO timestamp. */
  const offsetOf = (s: string) => Math.round((new Date(s).getTime() - parseDate(T).getTime()) / 86_400_000)

  // ——— People ———
  const person = (id: ID, name: string, role: User['role'], extra: Partial<User> = {}): User => ({
    id, name, role, email: `${name.toLowerCase().replace(/^(dr|prof)\.? /, '').normalize('NFD').replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@northfield.example`,
    active: true, title: '', bio: '', color: COLORS[id.length % COLORS.length], avatar: null, interests: [], expertise: [], links: [], timezone: 'Europe/London',
    weeklyGoalMinutes: 180, departmentId: null, notificationPrefs: { ...notifyAll }, createdAt: iso(-400 + int(0, 100)), lastActiveAt: iso(-int(0, 5), 9 + int(0, 9)), ...extra,
  })

  const instructors: User[] = [
    person('u-okafor', 'Dr. Amara Okafor', 'instructor', { title: 'Senior Lecturer in Data Science', departmentId: 'dep-data', color: '#0d7f89', expertise: ['Data analysis', 'Machine learning', 'Python'], bio: 'Amara spent eight years building forecasting models for public transport before moving into teaching. She cares about honest evaluation and clear explanations.', links: [{ label: 'Website', url: 'https://example.com/okafor' }] }),
    person('u-reyes', 'Daniel Reyes', 'instructor', { title: 'Lecturer in Software Engineering', departmentId: 'dep-cs', color: '#3d41d6', expertise: ['JavaScript', 'React', 'Python', 'Accessibility'], bio: 'Daniel has shipped web products for startups and public-sector teams. He teaches the way he codes: small steps, tested as you go.' }),
    person('u-chen', 'Mei Lin Chen', 'instructor', { title: 'Design Lead, School of Creative & Digital Arts', departmentId: 'dep-design', color: '#b04d9a', expertise: ['UX research', 'Interface design', 'Photography'], bio: 'Mei Lin runs the design studio and still spends a day a week doing user research with local organisations.' }),
    person('u-lindqvist', 'Dr. Hannah Lindqvist', 'instructor', { title: 'Associate Professor of Cell Biology', departmentId: 'dep-bio', color: '#22804f', expertise: ['Cell biology', 'Microscopy'], bio: 'Hannah’s lab studies how cells respond to mechanical stress. She has taught introductory biology for twelve years.' }),
    person('u-adeyemi', 'Dr. Samuel Adeyemi', 'instructor', { title: 'Lecturer in Mathematics', departmentId: 'dep-math', color: '#8a4fd0', expertise: ['Calculus', 'Statistics'], bio: 'Samuel believes anyone can learn calculus when the ideas come before the formulas.' }),
    person('u-nowak', 'Tomasz Nowak', 'instructor', { title: 'Lecturer in Business & Management', departmentId: 'dep-bus', color: '#c9790f', expertise: ['Accounting', 'Project management'], bio: 'A chartered accountant turned project lead, Tomasz teaches the practical side of running organisations.' }),
    person('u-raman', 'Priya Raman', 'instructor', { title: 'Lecturer in Marketing & Communication', departmentId: 'dep-lang', color: '#c4417f', expertise: ['Digital marketing', 'Academic writing', 'Spanish'], bio: 'Priya has led marketing teams in two countries and now teaches writing and strategy.' }),
  ]
  const admins: User[] = [
    person('u-whitfield', 'Grace Whitfield', 'admin', { title: 'Platform Administrator', color: '#2d4a6b', bio: 'Runs the learning platform and supports instructors.' }),
    person('u-berg', 'Jonas Berg', 'admin', { title: 'Registrar', color: '#5f7f51', bio: 'Looks after academic records, enrollments and certificates.' }),
  ]
  const maya = person('u-maya', 'Maya Patel', 'student', {
    title: 'Operations analyst', color: '#c4417f', interests: ['Data analysis', 'Statistics', 'Design'], weeklyGoalMinutes: 240, createdAt: iso(-160),
    bio: 'Moving from operations into analytics. Learning in the evenings and on Saturday mornings.', lastActiveAt: iso(0, 8, 40),
  })
  const students: User[] = [maya]
  for (let i = 0; i < 39; i++) {
    const name = `${FIRST[i]} ${LAST[(i * 7 + 3) % LAST.length]}`
    if (name === 'Maya Patel') continue
    students.push(person(`u-s${i + 1}`, name, 'student', {
      color: COLORS[i % COLORS.length], interests: [pick(INTERESTS), pick(INTERESTS)].filter((v, k, a) => a.indexOf(v) === k),
      weeklyGoalMinutes: pick([120, 180, 240, 300]), createdAt: iso(-int(20, 380)), active: i !== 17, timezone: pick(['Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Kolkata', 'Africa/Lagos']),
    }))
  }
  const users = [...students, ...instructors, ...admins]

  // ——— Academic structure ———
  const tDate = parseDate(T)
  const y = tDate.getMonth() >= 7 ? tDate.getFullYear() : tDate.getFullYear() - 1
  const academicYears = [
    { id: 'ay-prev', name: `${y - 1}–${String(y).slice(2)}`, start: `${y - 1}-09-01`, end: `${y}-08-31`, status: 'archived' as const },
    { id: 'ay-cur', name: `${y}–${String(y + 1).slice(2)}`, start: `${y}-09-01`, end: `${y + 1}-08-31`, status: 'active' as const },
    { id: 'ay-next', name: `${y + 1}–${String(y + 2).slice(2)}`, start: `${y + 1}-09-01`, end: `${y + 2}-08-31`, status: 'upcoming' as const },
  ]
  const curTerm = T < `${y}-12-20` ? 'active' : 'archived'
  const terms = [
    { id: 't-prev-aut', yearId: 'ay-prev', name: `Autumn ${y - 1}`, start: `${y - 1}-09-08`, end: `${y - 1}-12-19`, status: 'archived' as const },
    { id: 't-prev-spr', yearId: 'ay-prev', name: `Spring ${y}`, start: `${y}-01-12`, end: `${y}-05-29`, status: 'archived' as const },
    { id: 't-aut', yearId: 'ay-cur', name: `Autumn ${y}`, start: `${y}-09-07`, end: `${y}-12-18`, status: curTerm as 'active' | 'archived' },
    { id: 't-spr', yearId: 'ay-cur', name: `Spring ${y + 1}`, start: `${y + 1}-01-11`, end: `${y + 1}-05-28`, status: 'upcoming' as const },
    { id: 't-sum', yearId: 'ay-cur', name: `Summer ${y + 1}`, start: `${y + 1}-06-14`, end: `${y + 1}-08-13`, status: 'upcoming' as const },
  ]
  const faculties = [
    { id: 'fac-sci', name: 'Faculty of Science & Engineering', description: 'Computing, data, mathematics and the life sciences.', deanId: 'u-lindqvist' },
    { id: 'fac-bus', name: 'Faculty of Business & Humanities', description: 'Business, marketing, languages and communication.', deanId: 'u-nowak' },
    { id: 'fac-arts', name: 'School of Creative & Digital Arts', description: 'Design, media and visual practice.', deanId: 'u-chen' },
  ]
  const departments = [
    { id: 'dep-cs', name: 'Computer Science', code: 'CS', facultyId: 'fac-sci', description: 'Programming, software engineering and the web.', headId: 'u-reyes' },
    { id: 'dep-data', name: 'Data Science', code: 'DATA', facultyId: 'fac-sci', description: 'Analysis, statistics in practice and machine learning.', headId: 'u-okafor' },
    { id: 'dep-math', name: 'Mathematics', code: 'MATH', facultyId: 'fac-sci', description: 'Pure and applied mathematics.', headId: 'u-adeyemi' },
    { id: 'dep-bio', name: 'Life Sciences', code: 'BIO', facultyId: 'fac-sci', description: 'Cell and molecular biology.', headId: 'u-lindqvist' },
    { id: 'dep-bus', name: 'Business & Management', code: 'BUS', facultyId: 'fac-bus', description: 'Accounting, management and marketing.', headId: 'u-nowak' },
    { id: 'dep-lang', name: 'Languages & Communication', code: 'LANG', facultyId: 'fac-bus', description: 'Academic writing and modern languages.', headId: 'u-raman' },
    { id: 'dep-design', name: 'Design & Media', code: 'DES', facultyId: 'fac-arts', description: 'Interaction design, research and photography.', headId: 'u-chen' },
  ]
  const subjectCategories = [
    { id: 'scat-stem', name: 'Science & Technology', description: 'Computing, mathematics and the natural sciences.' },
    { id: 'scat-business', name: 'Business', description: 'Management, finance and marketing.' },
    { id: 'scat-humanities', name: 'Humanities & Languages', description: 'Writing, communication and languages.' },
    { id: 'scat-creative', name: 'Creative Arts', description: 'Design and visual practice.' },
    { id: 'scat-professional', name: 'Professional Skills', description: 'Skills that apply across disciplines.' },
  ]
  const subjects = SUBJECTS.map((s, i) => ({
    id: s.id, name: s.name, code: s.code, shortDescription: s.short,
    description: `${s.short} Courses in this subject are taught by the ${departments.find((d) => d.id === s.dept)!.name} department and share assessments and learning resources.`,
    categoryId: s.cat, departmentId: s.dept, instructorIds: [...s.instructors], yearId: s.status === 'archived' ? 'ay-prev' : 'ay-cur', termId: s.status === 'archived' ? 't-prev-spr' : i % 3 === 0 ? 't-aut' : null,
    level: s.level, icon: s.icon, status: s.status, createdAt: iso(-300 + i * 9), updatedAt: iso(-40 + i * 2),
  }))

  // ——— Courses ———
  const quizIdFor = (key: string) => key
  const courses: Course[] = COURSES.map((c, ci) => {
    let n = 0
    const sections = c.sections.map(([title, lessons], si) => ({
      id: `${c.key}-s${si + 1}`,
      title,
      lessons: lessons.map(([type, ltitle, minutes, extra = '', flags = []], li): Lesson => {
        n++
        const res = (c.resources ?? []).filter(([sec]) => sec === si && li === 0).map(([, t, url, size], k) => ({ id: `${c.key}-r${si}-${k}`, title: t, kind: url.startsWith('http') ? ('link' as const) : ('file' as const), url, size: size || undefined }))
        return {
          id: `${c.key}-l${n}`, title: ltitle, type, durationMinutes: minutes, required: !flags.includes('optional'), preview: flags.includes('preview'),
          summary: type === 'text' ? extra.split('\n')[0].slice(0, 160) : '',
          body: type === 'text' ? extra : '',
          videoUrl: '', url: type === 'pdf' || type === 'link' ? extra : '', quizId: type === 'quiz' ? quizIdFor(extra) : null, resources: res,
        }
      }),
    }))
    const created = -260 + ci * 11
    return {
      id: `c-${c.key}`, slug: c.key, title: c.title, shortDescription: c.short, description: c.description, categoryId: c.category, subjectId: c.subject, instructorId: c.instructor,
      termId: c.status === 'archived' ? 't-prev-spr' : 't-aut', level: c.level, estimatedHours: c.hours, objectives: c.objectives, prerequisites: c.prerequisites, tags: c.tags,
      price: c.price, status: c.status, publishedAt: c.status === 'published' || c.status === 'archived' ? iso(created + 14) : null, publishOn: null, awardsCertificate: c.certificate,
      thumbnail: null, artSeed: ci * 37 + 11, sections, createdAt: iso(created), updatedAt: iso(Math.min(-1, created + 60 + ci * 5)),
    }
  })
  const courseByKey = (key: string) => courses.find((c) => c.slug === key)!

  // ——— Quizzes & question bank ———
  const quizzes: Quiz[] = QUIZZES.map((q, qi) => {
    const course = courseByKey(q.course)
    const questions: Question[] = q.questions.map((x, i) => {
      const id = `${q.key}-q${i + 1}`
      const options = (x.options ?? []).map((text, j) => ({ id: `${id}-o${j + 1}`, text }))
      return {
        id, type: x.type, text: x.text, options, explanation: x.explanation, points: x.points ?? (x.difficulty === 'hard' ? 2 : 1), sourceId: `bq-${id}`,
        correct: x.type === 'short' ? (x.correct as string[]) : (x.correct as number[]).map((k) => options[k].id),
      }
    })
    return {
      id: q.key, courseId: course.id, kind: q.kind, title: q.title, description: q.description,
      instructions: q.kind === 'exam' ? 'Answer every question. The timer keeps running if you leave the page, and the exam is submitted automatically when time runs out.' : 'Take your time. You can move between questions before you submit.',
      questions, passingScore: q.passing, timeLimitMinutes: q.minutes, maxAttempts: q.attempts, availableFrom: null, availableUntil: q.due === null ? null : addDays(T, q.due),
      review: q.review, status: course.status === 'draft' ? 'draft' : 'published', createdAt: iso(-200 + qi * 7), updatedAt: iso(-30 + qi),
    }
  })
  quizzes.push({
    id: 'q-ml-draft', courseId: 'c-ml-found', kind: 'exam', title: 'Machine Learning Foundations — final exam', description: 'Draft — questions still being written.', instructions: 'Answer every question.',
    questions: [], passingScore: 70, timeLimitMinutes: 45, maxAttempts: 1, availableFrom: null, availableUntil: null, review: 'after_submit', status: 'draft', createdAt: iso(-6), updatedAt: iso(-2),
  })
  const bank: BankQuestion[] = [
    ...quizzes.flatMap((q) =>
      q.questions.map((x, i) => {
        const spec = QUIZZES.find((s) => s.key === q.id)!.questions[i]
        const course = courses.find((c) => c.id === q.courseId)!
        return { ...structuredClone(x), id: x.sourceId!, sourceId: null, subjectId: course.subjectId, courseId: course.id, topic: spec.topic, tags: [spec.topic.toLowerCase()], difficulty: spec.difficulty, status: 'active' as const, createdAt: q.createdAt, updatedAt: q.updatedAt }
      }),
    ),
    ...EXTRA_BANK.map((x, i) => {
      const id = `bq-extra-${i + 1}`
      const options = x.options.map((text, j) => ({ id: `${id}-o${j + 1}`, text }))
      return {
        id, type: x.type, text: x.text, options, correct: x.type === 'short' ? (x.correct as string[]) : (x.correct as number[]).map((k) => options[k].id), explanation: x.explanation, points: 1, sourceId: null,
        subjectId: x.subject, courseId: courseByKey(x.course).id, topic: x.topic, tags: x.tags, difficulty: x.difficulty, status: i === 5 ? ('draft' as const) : ('active' as const), createdAt: iso(-90 + i), updatedAt: iso(-20 + i),
      }
    }),
  ]

  // ——— Enrollments, progress, attempts, activity ———
  const enrollments: Enrollment[] = []
  const events: LearningEvent[] = []
  const attempts: QuizAttempt[] = []
  let eid = 0
  const MANUAL_ANSWERS = ['Leading with the answer tells the reader what matters before they read the details, so they can judge the evidence instead of hunting for the point.', 'Statistical significance tells us the effect probably isn’t chance; practical significance asks whether the effect is big enough to change a decision.']

  /** Builds answers that score roughly `accuracy` and returns a graded attempt. */
  function attempt(quiz: Quiz, userId: ID, at: string, accuracy: number, manual: 'graded' | 'pending' = 'graded'): QuizAttempt {
    const answers: Record<ID, string[]> = {}
    const manualPoints: Record<ID, number> = {}
    for (const q of quiz.questions) {
      const right = r() < accuracy
      if (q.type === 'short') {
        if (!q.correct.length) {
          answers[q.id] = [pick(MANUAL_ANSWERS)]
          if (manual === 'graded') manualPoints[q.id] = Math.max(1, Math.round(q.points * (right ? 1 : 0.5)))
        } else answers[q.id] = [right ? q.correct[0] : 'not sure']
      } else if (right) answers[q.id] = [...q.correct]
      else {
        const wrong = q.options.find((o) => !q.correct.includes(o.id))
        answers[q.id] = wrong ? [wrong.id] : []
      }
    }
    const g = gradeAttempt(quiz, answers, manualPoints)
    const started = new Date(new Date(at).getTime() - int(6, 25) * 60_000).toISOString()
    return { id: `att-${attempts.length + 1}`, quizId: quiz.id, userId, startedAt: started, submittedAt: at, answers, manualPoints, status: g.status, score: g.score, maxScore: g.maxScore, gradedById: g.status === 'graded' && Object.keys(manualPoints).length ? courses.find((c) => c.id === quiz.courseId)!.instructorId : null }
  }
  const pct = (a: QuizAttempt) => (a.maxScore ? (a.score / a.maxScore) * 100 : 0)

  /** Completes the first `done` required lessons between two day offsets, with attempts for quiz lessons. */
  function enroll(userId: ID, course: Course, opts: { start: number; done: number; last: number; status?: Enrollment['status']; failNext?: boolean }): Enrollment {
    const req = requiredLessons(course)
    const done = Math.min(req.length, opts.done)
    const progress: Record<ID, string> = {}
    const span = Math.max(1, opts.last - opts.start)
    for (let i = 0; i < done; i++) {
      const lesson = req[i]
      const day = Math.round(opts.start + ((i + 1) / done) * span)
      const at = iso(Math.min(0, day), 8 + int(0, 12), int(0, 59))
      if (lesson.quizId) {
        const quiz = quizzes.find((q) => q.id === lesson.quizId)!
        if (r() < 0.3) attempts.push(attempt(quiz, userId, iso(Math.min(0, day - 1), 19), 0.35))
        let a = attempt(quiz, userId, at, 0.85)
        if (a.status !== 'graded' || pct(a) < quiz.passingScore) a = attempt(quiz, userId, at, 1)
        attempts.push(a)
      }
      progress[lesson.id] = at
      events.push({ id: `ev-${events.length + 1}`, userId, courseId: course.id, lessonId: lesson.id, kind: lesson.quizId ? 'quiz' : 'lesson', minutes: lesson.durationMinutes + int(-2, 8), at })
    }
    // Extra study sessions (reading, practice) between enrollment and last activity.
    const sessions = Math.round(done * 0.8) + int(0, 3)
    for (let i = 0; i < sessions; i++) {
      const day = Math.min(0, opts.start + Math.round(r() * span))
      events.push({ id: `ev-${events.length + 1}`, userId, courseId: course.id, lessonId: null, kind: 'study', minutes: int(10, 45), at: iso(day, 7 + int(0, 14), int(0, 59)) })
    }
    const next = req[done]
    if (opts.failNext && next?.quizId) attempts.push(attempt(quizzes.find((q) => q.id === next.quizId)!, userId, iso(Math.min(0, opts.last), 20), 0.3))
    const complete = done === req.length && req.length > 0
    const status = opts.status ?? (complete ? 'completed' : 'active')
    const lastLesson = done ? req[done - 1] : null
    const e: Enrollment = {
      id: `e-${++eid}`, userId, courseId: course.id, status, enrolledAt: iso(opts.start, 9), completedAt: status === 'completed' ? progress[req[req.length - 1].id] : null,
      lastActivityAt: done ? progress[lastLesson!.id] : iso(opts.start, 9, 5), lastLessonId: lastLesson?.id ?? null, progress, bookmarks: [], notes: {}, groupId: null,
    }
    enrollments.push(e)
    return e
  }

  // The main demo student, with a hand-picked mix of states.
  const reqLen = (key: string) => requiredLessons(courseByKey(key)).length
  const mPy = enroll('u-maya', courseByKey('py-data'), { start: -48, done: 7, last: -1 })
  mPy.bookmarks = ['py-data-l7']
  mPy.notes = { 'py-data-l5': 'parse_dates + dtype for IDs. Check shape/dtypes/isna every time.' }
  enroll('u-maya', courseByKey('js-ess'), { start: -120, done: reqLen('js-ess'), last: -41 })
  enroll('u-maya', courseByKey('ui-fund'), { start: -150, done: reqLen('ui-fund'), last: -76 })
  enroll('u-maya', courseByKey('stats'), { start: -60, done: reqLen('stats') - 4, last: 0 })
  enroll('u-maya', courseByKey('ux-research'), { start: -12, done: 2, last: -2 })
  enroll('u-maya', courseByKey('calc-1'), { start: -45, done: 1, last: -19 })
  // A visible streak: Maya studied each of the last five days.
  for (let d = 0; d < 5; d++) events.push({ id: `ev-${events.length + 1}`, userId: 'u-maya', courseId: d % 2 ? 'c-stats' : 'c-py-data', lessonId: null, kind: 'study', minutes: int(20, 50), at: iso(-d, 7, 30) })

  const weighted = COURSES.flatMap((c) => Array.from({ length: c.weight }, () => c.key))
  for (const s of students.slice(1)) {
    const n = int(1, 5)
    const keys = new Set<string>()
    while (keys.size < n) keys.add(pick(weighted))
    for (const key of keys) {
      const course = courseByKey(key)
      const len = reqLen(key)
      const start = course.status === 'archived' ? -int(260, 330) : -int(5, 210)
      const roll = r()
      const done = course.status === 'archived' ? len : roll < 0.34 ? len : roll < 0.41 ? 0 : Math.round(len * (0.1 + r() * 0.85))
      const last = Math.min(0, course.status === 'archived' ? start + int(30, 70) : start + Math.round(-start * (0.4 + r() * 0.6)))
      const status = done === len ? undefined : roll > 0.96 ? 'cancelled' : roll > 0.92 ? 'suspended' : undefined
      enroll(s.id, course, { start, done, last, status, failNext: r() < 0.25 })
    }
  }
  // One exam still waiting for a human grade, so the grading queue has work.
  const pendingExam = quizzes.find((q) => q.id === 'q-py-final')!
  const pendingStudent = enrollments.find((e) => e.courseId === 'c-py-data' && e.status === 'active' && e.userId !== 'u-maya' && Object.keys(e.progress).length >= 9)
  if (pendingStudent) attempts.push(attempt(pendingExam, pendingStudent.userId, iso(-1, 21), 0.8, 'pending'))

  // ——— Groups ———
  const pyStudents = enrollments.filter((e) => e.courseId === 'c-py-data').map((e) => e.userId)
  const groups: StudentGroup[] = [
    { id: 'g-data-cohort', name: 'Data Analytics Cohort', kind: 'classroom', description: 'Autumn intake studying Python for Data Analysis and Statistics together, with weekly live sessions.', yearId: 'ay-cur', studentIds: pyStudents.slice(0, 14), courseIds: ['c-py-data', 'c-stats'], createdAt: iso(-60) },
    { id: 'g-web-studio', name: 'Web Studio', kind: 'classroom', description: 'Project-based group building web apps across the JavaScript and React courses.', yearId: 'ay-cur', studentIds: enrollments.filter((e) => e.courseId === 'c-react-apps').map((e) => e.userId).slice(0, 10), courseIds: ['c-js-ess', 'c-react-apps'], createdAt: iso(-75) },
    { id: 'g-evening', name: `Evening Batch ${y}`, kind: 'batch', description: 'Part-time learners who joined in the autumn intake.', yearId: 'ay-cur', studentIds: students.slice(0, 12).map((s) => s.id), courseIds: [], createdAt: iso(-55) },
    { id: 'g-weekend', name: `Weekend Batch ${y}`, kind: 'batch', description: 'Weekend learners with Saturday workshops.', yearId: 'ay-cur', studentIds: students.slice(12, 22).map((s) => s.id), courseIds: [], createdAt: iso(-55) },
    { id: 'g-prev', name: `Spring Batch ${y}`, kind: 'batch', description: 'Last academic year’s spring intake.', yearId: 'ay-prev', studentIds: students.slice(22, 30).map((s) => s.id), courseIds: [], createdAt: iso(-280) },
  ]
  for (const e of enrollments) if (groups[0].studentIds.includes(e.userId) && groups[0].courseIds.includes(e.courseId)) e.groupId = 'g-data-cohort'

  // ——— Assignments & submissions ———
  const assignmentSpecs: [string, string, string, number, number][] = [
    ['py-data', 'Bike trip analysis report', 'Using the bike trips sample data, answer the question: “Which three stations lose the most bikes on weekday mornings?” Submit a short report (300–500 words) with one chart and your notebook as an attachment.', 4, 20],
    ['stats', 'A/B test design brief', 'Design an A/B test for a change of your choice. State the hypothesis, primary metric, minimum detectable effect and the sample size you need, with your reasoning.', -9, 20],
    ['ux-research', 'Interview discussion guide', 'Write a discussion guide for five 30-minute interviews about how people plan weekly meals. Include goals, warm-up, core questions and follow-up prompts.', 8, 15],
    ['js-ess', 'Refactor with array methods', 'Rewrite the provided loop-heavy script using map, filter and reduce. Explain one place where a plain loop would still be clearer.', -50, 10],
    ['ml-found', 'Leakage audit', 'Review the provided notebook and list every source of leakage you can find, with a fix for each.', 11, 25],
    ['react-apps', 'Accessible sign-up form', 'Build a sign-up form with labelled inputs, inline validation and an error summary. Submit a link to your repository.', -3, 30],
    ['dig-mkt', 'Campaign plan', 'Plan a six-week campaign for a local bakery launching online orders. Include audience, channels, calendar and metrics.', 15, 30],
    ['acad-write', 'Thesis and outline', 'Submit a thesis statement and a paragraph-level outline for a 1,500-word essay on a topic in your field.', -6, 10],
  ]
  const assignments: Assignment[] = assignmentSpecs.map(([key, title, instructions, due, points], i) => ({
    id: `as-${i + 1}`, courseId: courseByKey(key).id, title, instructions, dueDate: addDays(T, due), maxPoints: points, allowLate: i !== 3, status: 'assigned', createdAt: iso(Math.min(due, 0) - 21),
  }))
  assignments.push({ id: 'as-draft', courseId: 'c-ml-found', title: 'Model comparison write-up', instructions: 'Compare two models on the provided data set and justify your choice.', dueDate: addDays(T, 30), maxPoints: 20, allowLate: true, status: 'draft', createdAt: iso(-2) })
  const submissions: Submission[] = []
  const FEEDBACK = ['Clear structure and well-chosen evidence. Next time, say more about the limits of your data.', 'Good work. Your reasoning in the second section is strong; tighten the introduction.', 'Solid submission — check the formatting of your references.', 'Nice job. The chart title could state the finding more directly.']
  for (const a of assignments.filter((x) => x.status === 'assigned')) {
    const due = offsetOf(a.dueDate + 'T12:00:00')
    for (const e of enrollments.filter((x) => x.courseId === a.courseId && (x.status === 'active' || x.status === 'completed'))) {
      if (e.userId === 'u-maya') continue
      if (r() < (due > 0 ? 0.35 : 0.75)) {
        const late = due <= 0 && r() < 0.2
        const subDay = late ? Math.min(0, due + int(1, 2)) : Math.min(0, due - int(0, 4))
        const graded = due < 0 && r() < 0.7
        submissions.push({
          id: `sub-${submissions.length + 1}`, assignmentId: a.id, userId: e.userId, text: 'My submission is attached. Summary: I followed the brief and noted my assumptions in the first section.',
          attachments: r() < 0.6 ? [{ name: 'submission.pdf', size: int(80, 900) * 1024, type: 'application/pdf' }] : [], submittedAt: iso(subDay, 18, int(0, 59)),
          status: graded ? 'graded' : late ? 'late' : 'submitted', grade: graded ? Math.round(a.maxPoints * (0.6 + r() * 0.4)) : null, feedback: graded ? pick(FEEDBACK) : '', gradedAt: graded ? iso(Math.min(0, subDay + 3), 11) : null,
        })
      }
    }
  }
  const asOf = (title: string) => assignments.find((a) => a.title === title)!
  submissions.push(
    { id: 'sub-m1', assignmentId: asOf('A/B test design brief').id, userId: 'u-maya', text: 'Hypothesis: showing delivery dates on product pages increases checkout completion. Primary metric: checkout completion rate. MDE: 2 percentage points from a 38% baseline. With α = 0.05 and 80% power that needs about 9,300 users per arm — roughly two weeks of traffic.', attachments: [{ name: 'ab-test-brief.pdf', size: 214_000, type: 'application/pdf' }], submittedAt: iso(-10, 21, 14), status: 'graded', grade: 18, feedback: 'Excellent brief. The sample-size reasoning is exactly right; consider a guardrail metric such as refund rate.', gradedAt: iso(-6, 10) },
    { id: 'sub-m2', assignmentId: asOf('Refactor with array methods').id, userId: 'u-maya', text: 'Refactored version attached. A plain loop is still clearer where we break early on the first invalid record.', attachments: [{ name: 'refactor.js', size: 3_200, type: 'text/javascript' }], submittedAt: iso(-52, 20), status: 'graded', grade: 9, feedback: 'Clean and readable — nice point about early exit.', gradedAt: iso(-48, 9) },
  )

  // ——— Certificates ———
  const certificates: Certificate[] = []
  for (const e of enrollments.filter((x) => x.status === 'completed')) {
    const course = courses.find((c) => c.id === e.courseId)!
    if (!course.awardsCertificate) continue
    certificates.push({
      id: `cert-${certificates.length + 1}`, code: certificateCode(r), enrollmentId: e.id, userId: e.userId, courseId: course.id, issuedAt: e.completedAt!, status: 'valid', revokedReason: '',
      studentName: users.find((u) => u.id === e.userId)!.name, courseTitle: course.title, instructorName: users.find((u) => u.id === course.instructorId)!.name, issuer: 'Northfield Institute',
    })
  }
  const revoke = certificates.find((c) => c.userId !== 'u-maya' && c.courseId === 'c-film-photo')
  if (revoke) Object.assign(revoke, { status: 'revoked', revokedReason: 'Issued in error: the enrollment was transferred to another account.' })

  // ——— Reviews ———
  const reviews: Review[] = []
  for (const e of enrollments) {
    const progressed = Object.keys(e.progress).length
    if (e.status === 'completed' ? r() < 0.65 : progressed > 4 && r() < 0.25) {
      reviews.push({ id: `rv-${reviews.length + 1}`, courseId: e.courseId, userId: e.userId, rating: pick([5, 5, 5, 4, 4, 4, 4, 3]), body: pick(REVIEW_TEXT), status: 'published', createdAt: iso(offsetOf(e.lastActivityAt!) + 1) })
    }
  }
  if (reviews.length > 4) reviews[3].status = 'hidden'
  reviews.push({ id: 'rv-maya', courseId: 'c-js-ess', userId: 'u-maya', rating: 5, body: 'Short, focused lessons and the async section finally made promises click for me.', status: 'published', createdAt: iso(-40) })

  // ——— Announcements & notifications ———
  const announcements = [
    { id: 'an-1', courseId: 'c-py-data', authorId: 'u-okafor', title: 'Live Q&A this Thursday', body: 'I’ll run a 45-minute Q&A on Thursday at 18:00 (UK time) covering the cleaning section and the final assessment. Bring your questions — the recording will be posted here afterwards.', pinned: true, createdAt: iso(-2, 9) },
    { id: 'an-2', courseId: 'c-py-data', authorId: 'u-okafor', title: 'Updated energy data set', body: 'The energy worksheet now uses the corrected 2025 file. If you downloaded it before last Monday, please download it again from the lesson resources.', pinned: false, createdAt: iso(-9, 14) },
    { id: 'an-3', courseId: 'c-stats', authorId: 'u-adeyemi', title: 'Midterm exam is open', body: 'The midterm is now available. You have one attempt and 40 minutes. Make sure you have a quiet, uninterrupted block of time before you start.', pinned: true, createdAt: iso(-3, 8) },
    { id: 'an-4', courseId: 'c-ux-research', authorId: 'u-chen', title: 'Recruiting tips', body: 'Several of you asked how to find interview participants. I’ve added a short guide to the Interviews section — start with your own network, then use a screener.', pinned: false, createdAt: iso(-5, 16) },
    { id: 'an-5', courseId: 'c-react-apps', authorId: 'u-reyes', title: 'React 19 notes added', body: 'I’ve added notes on the newest React APIs to the State and effects section. Nothing you’ve built needs to change.', pinned: false, createdAt: iso(-12, 11) },
    { id: 'an-6', courseId: 'c-ml-found', authorId: 'u-okafor', title: 'Office hours moved', body: 'Office hours move to Wednesdays at 12:30 for the rest of term.', pinned: false, createdAt: iso(-20, 10) },
  ]
  let nid = 0
  const note = (userId: ID, kind: Notification['kind'], title: string, body: string, link: string, day: number, read = false): Notification => ({ id: `n-${++nid}`, userId, kind, title, body, link, read, createdAt: iso(day, 9 + (nid % 8), (nid * 7) % 60) })
  const mayaCerts = certificates.filter((c) => c.userId === 'u-maya')
  const notifications: Notification[] = [
    note('u-maya', 'deadline', 'Final assessment due in 6 days', 'Python for Data Analysis — final assessment closes soon.', '/learn/assessments', 0),
    note('u-maya', 'announcement', 'Live Q&A this Thursday', 'Dr. Amara Okafor posted in Python for Data Analysis.', '/learn/course/c-py-data/overview', -2),
    note('u-maya', 'deadline', 'Bike trip analysis report due in 4 days', 'Submit your report before the deadline.', '/learn/assignments/as-1', -1),
    note('u-maya', 'feedback', 'A/B test design brief graded', 'You scored 18/20. Read your feedback.', '/learn/assignments/as-2', -6, true),
    note('u-maya', 'quiz', 'Quiz passed: Check your understanding', 'You passed the loading data quiz.', '/learn/assessments', -18, true),
    ...mayaCerts.map((c) => note('u-maya', 'certificate', 'Certificate issued', `Your certificate for ${c.courseTitle} is ready.`, `/learn/certificates/${c.id}`, offsetOf(c.issuedAt), true)),
    note('u-maya', 'enrollment', 'Enrolled in UX Research Methods', 'You can start the first lesson now.', '/learn/course/c-ux-research/overview', -12, true),
    note('u-okafor', 'enrollment', '3 new enrollments', 'New students joined Python for Data Analysis this week.', '/teach/students', -1),
    note('u-okafor', 'feedback', 'Exam waiting for grading', 'A final assessment has a written answer to grade.', '/teach/grades', -1),
    note('u-okafor', 'system', 'Deep Learning with PyTorch is in review', 'An administrator will review your course before it’s published.', '/teach/courses', -4, true),
    note('u-reyes', 'feedback', 'New submissions', 'Accessible sign-up form has new submissions to review.', '/teach/assignments', -2),
    note('u-whitfield', 'system', 'Course submitted for review', 'Dr. Amara Okafor submitted Deep Learning with PyTorch.', '/admin/courses?status=review', -4),
    note('u-whitfield', 'enrollment', '6 new student registrations', 'New accounts were created this week.', '/admin/students', -2),
    note('u-whitfield', 'certificate', 'Certificate revoked', 'A Film Photography Basics certificate was revoked.', '/admin/certificates', -30, true),
    note('u-berg', 'system', `Autumn ${y} term is active`, 'Enrollment reporting now uses the new term.', '/admin/terms', -40, true),
  ]

  const audit = [
    ['u-whitfield', 'Updated platform settings', '/admin/settings', 'platform', -1],
    ['u-berg', `Created term Summer ${y + 1}`, '/admin/terms', 'academic', -3],
    ['u-okafor', 'Submitted Deep Learning with PyTorch for review', '/admin/courses?status=review', 'course', -4],
    ['u-berg', 'Enrolled 4 students in Data Analytics Cohort', '/admin/groups', 'enrollment', -6],
    ['u-whitfield', 'Created subject Spanish Language (LANG120)', '/admin/subjects/sub-lang120', 'academic', -8],
    ['u-raman', 'Created course Conversational Spanish A1', '/admin/courses', 'course', -9],
    ['u-whitfield', 'Archived subject Photography (DES160)', '/admin/subjects/sub-des160', 'academic', -14],
    ['u-berg', 'Revoked a certificate for Film Photography Basics', '/admin/certificates', 'certificate', -30],
    ['u-whitfield', 'Changed theme preset to Modern Indigo', '/admin/theme', 'platform', -33],
    ['u-berg', `Archived academic year ${y - 1}–${String(y).slice(2)}`, '/admin/academic-years', 'academic', -45],
  ].map(([actorId, message, link, area, day], i) => ({ id: `au-${i + 1}`, actorId: actorId as ID, message: message as string, link: link as string, area: area as AppData['audit'][number]['area'], at: iso(day as number, 10 + i % 6, (i * 13) % 60) }))

  return {
    version: DATA_VERSION,
    seededOn: T,
    currentUserId: 'u-maya',
    users, academicYears, terms, faculties, departments, subjectCategories, subjects,
    categories: CATEGORIES.map((c) => ({ ...c })),
    groups, courses, enrollments, events: events.sort((a, b) => a.at.localeCompare(b.at)), quizzes, attempts, bank, assignments, submissions, certificates, announcements, reviews,
    comments: [
      { id: 'cm-1', courseId: 'c-py-data', lessonId: 'py-data-l5', userId: students[3].id, parentId: null, body: 'Is there a way to make read_csv fail loudly when a column has mixed types, instead of quietly reading it as text?', createdAt: iso(-6, 20, 12) },
      { id: 'cm-2', courseId: 'c-py-data', lessonId: 'py-data-l5', userId: 'u-okafor', parentId: 'cm-1', body: 'Pass an explicit dtype for that column. If a value can’t be converted, pandas raises an error that names the column — much better than discovering it three steps later.', createdAt: iso(-5, 9, 40) },
      { id: 'cm-3', courseId: 'c-py-data', lessonId: 'py-data-l7', userId: students[6].id, parentId: null, body: 'When would you flag missing values rather than fill them?', createdAt: iso(-3, 18, 5) },
      { id: 'cm-4', courseId: 'c-py-data', lessonId: 'py-data-l7', userId: 'u-maya', parentId: 'cm-3', body: 'I flag them when the fact that it’s missing is itself informative — e.g. customers who skipped the income question.', createdAt: iso(-2, 21, 30) },
      { id: 'cm-5', courseId: 'c-stats', lessonId: 'stats-l3', userId: 'u-maya', parentId: null, body: 'For the coin example, does order matter when we count outcomes?', createdAt: iso(-8, 19, 0) },
      { id: 'cm-6', courseId: 'c-stats', lessonId: 'stats-l3', userId: 'u-adeyemi', parentId: 'cm-5', body: 'Good question — for “two heads” there’s only one outcome (HH), so order doesn’t change the answer here. It matters for “one head and one tail”: HT and TH are both counted.', createdAt: iso(-7, 10, 15) },
    ],
    notifications: notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    audit: audit.sort((a, b) => b.at.localeCompare(a.at)),
    settings: {
      name: 'Northfield Institute', tagline: 'Learning portal', description: 'Courses and programmes from Northfield Institute, open to students, staff and lifelong learners.', logo: null, favicon: null,
      language: 'en-GB', timezone: 'Europe/London', supportEmail: 'learning@northfield.example',
      certificate: { issuer: 'Northfield Institute', signatoryName: 'Grace Whitfield', signatoryTitle: 'Director of Digital Learning', showSeal: true, footnote: 'Verify this certificate at the address below using its certificate ID.' },
      learning: { quizMustPass: true, defaultWeeklyGoal: 180, allowLateSubmissions: true },
      publication: { requireReview: true, minLessons: 3 },
      academic: { years: true, terms: true, faculties: true, departments: true, subjects: true },
    },
    theme: structuredClone(DEFAULT_THEME),
    website: defaultWebsite(),
  }
}

export function defaultWebsite(): AppData['website'] {
  return {
    headline: 'Learn something that changes what you can do',
    subheading: 'Practical courses from Northfield Institute’s lecturers — with real projects, honest feedback and a certificate when you finish.',
    ctaText: 'Browse courses',
    heroVisual: 'syllabus',
    sections: (['featured', 'categories', 'benefits', 'instructors', 'stats', 'testimonials', 'faq', 'cta'] as const).map((id) => ({ id, visible: true })),
    featuredCourseIds: ['c-py-data', 'c-react-apps', 'c-ux-research', 'c-stats'],
    visibleCategoryIds: CATEGORIES.map((c) => c.id),
    testimonials: [
      { id: 'tm-1', name: 'Sofia García', role: 'Moved from retail into data analysis', quote: 'The projects felt like real work. I showed my final analysis in an interview and talked about it for twenty minutes.' },
      { id: 'tm-2', name: 'Kwame Mensah', role: 'Part-time student, Web Studio group', quote: 'I could study after my kids were asleep and still get feedback from an actual lecturer within a couple of days.' },
      { id: 'tm-3', name: 'Elena Rossi', role: 'Product designer', quote: 'The research course gave me the vocabulary to argue for user testing at work — and we now do it every sprint.' },
    ],
    faq: [
      { id: 'fq-1', q: 'Do I need any experience to start?', a: 'Most beginner courses assume none. Each course page lists its prerequisites, and many have free preview lessons so you can try before you enroll.' },
      { id: 'fq-2', q: 'How long do I have access to a course?', a: 'As long as your enrollment is active. If a course is later retired, enrolled students keep access to its material.' },
      { id: 'fq-3', q: 'How do certificates work?', a: 'Complete every required lesson and pass the required quizzes, and a certificate is issued automatically. Each one has an ID that anyone can check on the verification page.' },
      { id: 'fq-4', q: 'Can I study on my phone?', a: 'Yes. Lessons, quizzes and your progress work on phones, tablets and desktops.' },
      { id: 'fq-5', q: 'Are there deadlines?', a: 'Self-paced courses have none. Some courses run with a cohort and set due dates for quizzes and assignments, which you’ll see on your calendar.' },
    ],
    footerBlurb: 'Northfield Institute is a fictional college used to demonstrate this learning platform template.',
    nav: [
      { id: 'courses', label: 'Courses', visible: true },
      { id: 'categories', label: 'Subjects', visible: true },
      { id: 'instructors', label: 'Instructors', visible: true },
      { id: 'faq', label: 'FAQ', visible: true },
      { id: 'verify', label: 'Verify a certificate', visible: true },
    ],
    hiddenNav: [],
  }
}
