import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Eraser, Send, Timer } from 'lucide-react'
import type { Quiz, QuizAttempt } from '@/types'
import { NotFound } from '@/app/App'
import { Badge } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Overlay'
import { PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatDate, formatDuration, today } from '@/lib/date'
import { answered, attemptBlocker, deadlineOf } from '@/services/assessment'
import { allLessons, bestAttempt, passed, pct } from '@/services/learning'
import { useLookup, useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { QuestionView } from './QuestionView'

export function AttemptHistory({ quiz, attempts }: { quiz: Quiz; attempts: QuizAttempt[] }) {
  const done = attempts.filter((a) => a.status !== 'in_progress').sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  if (!done.length) return <p className="text-sm text-muted">No attempts yet.</p>
  return (
    <ul className="divide-y divide-line">
      {done.map((a, i) => (
        <li key={a.id}>
          <Link to={`/learn/quizzes/${quiz.id}/attempts/${a.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
            <span className="w-20 text-muted">Attempt {done.length - i}</span>
            <span className="flex-1 text-muted">{formatDate(a.submittedAt!.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="font-medium tabular">{a.status === 'pending_review' ? '—' : `${a.score}/${a.maxScore} · ${Math.round(pct(a))}%`}</span>
            {a.status === 'pending_review' ? <Badge color="var(--secondary)">Awaiting grading</Badge> : passed(quiz, a) ? <Badge color="var(--success)">Passed</Badge> : <Badge color="var(--danger)">Not passed</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Runner({ quiz, attempt }: { quiz: Quiz; attempt: QuizAttempt }) {
  const { actions } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, confirmDialog] = useConfirm()
  const [answers, setAnswers] = useState<Record<string, string[]>>(attempt.answers)
  const [i, setI] = useState(0)
  const [now, setNow] = useState(Date.now())
  const submitting = useRef(false)
  const deadline = deadlineOf(quiz, attempt)
  const left = deadline ? deadline - now : null
  const q = quiz.questions[i]
  const unanswered = quiz.questions.filter((x) => !answered(answers[x.id])).length

  const submit = (auto = false) => {
    if (submitting.current) return
    submitting.current = true
    const r = actions.submitAttempt(attempt.id, answers)
    if (!r.ok) {
      submitting.current = false
      return toast(Object.values(r.errors)[0], { tone: 'error' })
    }
    toast(auto ? 'Time’s up — your answers were submitted' : 'Quiz submitted', { tone: auto ? 'info' : 'success' })
    navigate(`/learn/quizzes/${quiz.id}/attempts/${attempt.id}`, { replace: true })
  }

  useEffect(() => {
    if (!deadline) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [deadline])
  useEffect(() => {
    if (left !== null && left <= 0) submit(true)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const change = (a: string[]) => {
    const next = { ...answers, [q.id]: a }
    setAnswers(next)
    actions.saveAnswers(attempt.id, next) // so a refresh resumes where you were
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-xl font-semibold">{quiz.title}</h1>
        {left !== null && (
          <span role="timer" aria-live={left < 60_000 ? 'assertive' : 'off'} className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold tabular', left < 60_000 ? 'bg-danger/12 text-danger' : left < 5 * 60_000 ? 'bg-warning/12 text-warning' : 'bg-surface-3 text-ink')}>
            <Timer className="size-4" /> {formatDuration(Math.max(0, left))} left
          </span>
        )}
      </div>
      <nav aria-label="Questions" className="mb-5 flex flex-wrap gap-1.5">
        {quiz.questions.map((x, k) => (
          <button
            key={x.id}
            onClick={() => setI(k)}
            aria-current={k === i ? 'step' : undefined}
            aria-label={`Question ${k + 1}${answered(answers[x.id]) ? ', answered' : ', not answered'}`}
            className={cn('grid size-9 place-items-center rounded-[var(--r-ctl)] border text-sm font-medium tabular', k === i ? 'border-primary bg-primary text-primary-ink' : answered(answers[x.id]) ? 'border-primary/40 bg-primary-soft text-primary' : 'border-line text-muted hover:border-line-strong')}
          >
            {k + 1}
          </button>
        ))}
        <span className="ml-2 self-center text-xs text-muted">{quiz.questions.length - unanswered} of {quiz.questions.length} answered</span>
      </nav>
      <div className="panel p-5 sm:p-7">
        <QuestionView key={q.id} q={q} index={i} answer={answers[q.id] ?? []} onChange={change} />
        <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <Button icon={<ChevronLeft />} disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Button>
          <Button variant="ghost" icon={<Eraser />} disabled={!answered(answers[q.id])} onClick={() => change([])}>Clear answer</Button>
          <div className="flex-1" />
          {i < quiz.questions.length - 1 ? (
            <Button variant="primary" onClick={() => setI(i + 1)}>Next <ChevronRight className="size-4" /></Button>
          ) : (
            <Button
              variant="primary"
              icon={<Send />}
              onClick={() =>
                confirm({
                  title: 'Submit your answers?',
                  body: unanswered ? `${unanswered} question${unanswered > 1 ? 's are' : ' is'} unanswered and will score zero. You can’t change answers after submitting.` : 'You’ve answered every question. You can’t change answers after submitting.',
                  confirmLabel: 'Submit quiz',
                  tone: 'primary',
                  onConfirm: () => submit(),
                })
              }
            >
              Submit quiz
            </Button>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-faint">Answers are saved in this browser as you go. Timing and attempt limits are enforced by this demo in the browser; a production system must enforce them on the server.</p>
      {confirmDialog}
    </div>
  )
}

export default function QuizPage() {
  const { quizId } = useParams()
  const { data, actions } = useStore()
  const look = useLookup()
  const me = useMe()
  const toast = useToast()
  const quiz = look.quiz(quizId)
  const attempts = data.attempts.filter((a) => a.quizId === quizId && a.userId === me.id)
  const open = attempts.find((a) => a.status === 'in_progress')
  const expired = open && deadlineOf(quiz!, open) !== null && deadlineOf(quiz!, open)! <= Date.now()

  // A timed attempt left open past its deadline is submitted with the answers saved so far.
  useEffect(() => {
    if (open && expired) {
      const r = actions.submitAttempt(open.id, open.answers)
      if (r.ok) toast('Your time ran out while you were away — the answers you’d saved were submitted.', { tone: 'info' })
    }
  }, [open?.id, expired]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!quiz) return <NotFound />
  const course = look.course(quiz.courseId)!
  const enrollment = data.enrollments.find((e) => e.userId === me.id && e.courseId === quiz.courseId && (e.status === 'active' || e.status === 'completed'))
  if (open && !expired) return <Runner quiz={quiz} attempt={open} />

  const blocker = enrollment ? attemptBlocker(quiz, data.attempts, me.id, today()) : 'Enroll in the course to take this quiz'
  const best = bestAttempt(data.attempts, quiz.id, me.id)
  const used = attempts.filter((a) => a.status !== 'in_progress').length
  const lesson = allLessons(course).find((l) => l.quizId === quiz.id)
  const start = () => {
    const r = actions.startAttempt(quiz.id)
    if (!r.ok) toast(Object.values(r.errors)[0], { tone: 'error' })
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <Link to={lesson ? `/learn/course/${course.id}/${lesson.id}` : '/learn/assessments'} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />{lesson ? 'Back to lesson' : 'Quizzes & Assessments'}</Link>
      <PageHeader title={quiz.title} description={`${course.title} · ${quiz.kind === 'exam' ? 'Exam' : 'Quiz'}`} />
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Section title="Before you start">
          <p className="text-sm leading-relaxed">{quiz.description}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{quiz.instructions}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-faint">Questions</dt><dd className="font-medium">{quiz.questions.length} · {quiz.questions.reduce((s, x) => s + x.points, 0)} points</dd></div>
            <div><dt className="text-faint">Pass mark</dt><dd className="font-medium">{quiz.passingScore}%</dd></div>
            <div><dt className="text-faint">Time limit</dt><dd className="inline-flex items-center gap-1 font-medium"><Clock className="size-3.5" />{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} minutes` : 'None'}</dd></div>
            <div><dt className="text-faint">Attempts</dt><dd className="font-medium">{used} used{quiz.maxAttempts ? ` of ${quiz.maxAttempts}` : ' · unlimited'}</dd></div>
            <div><dt className="text-faint">Due</dt><dd className="font-medium">{quiz.availableUntil ? formatDate(quiz.availableUntil, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date'}</dd></div>
            <div><dt className="text-faint">Answer review</dt><dd className="font-medium">{{ after_submit: 'After submitting', after_pass: 'After passing', never: 'Not shown' }[quiz.review]}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {blocker ? <p className="text-sm font-medium text-danger">{blocker}</p> : <Button variant="primary" onClick={start}>{used ? 'Start a new attempt' : 'Start quiz'}</Button>}
            {!enrollment && <ButtonLink to={`/learn/explore/${course.slug}`}>View course</ButtonLink>}
          </div>
          {quiz.timeLimitMinutes && !blocker && <p className="mt-2 text-xs text-muted">The timer starts when you press start and keeps running if you leave the page.</p>}
        </Section>
        <Section title="Your attempts" action={best && <span className="text-sm">Best <strong className="tabular">{Math.round(pct(best))}%</strong></span>}>
          <AttemptHistory quiz={quiz} attempts={attempts} />
        </Section>
      </div>
    </div>
  )
}
