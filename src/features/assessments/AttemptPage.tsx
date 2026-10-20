import { Link, useParams } from 'react-router'
import { ArrowLeft, CircleCheck, CircleX, Hourglass, RotateCcw } from 'lucide-react'
import { NotFound } from '@/app/App'
import { ProgressRing } from '@/components/ui/Badges'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/misc'
import { formatDuration } from '@/lib/date'
import { attemptBlocker } from '@/services/assessment'
import { allLessons, passed, pct } from '@/services/learning'
import { useLookup, useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { AttemptHistory } from './QuizPage'
import { QuestionView } from './QuestionView'
import { today } from '@/lib/date'

export default function AttemptPage() {
  const { quizId, attemptId } = useParams()
  const { data } = useStore()
  const look = useLookup()
  const me = useMe()
  const quiz = look.quiz(quizId)
  const attempt = data.attempts.find((a) => a.id === attemptId && a.quizId === quizId)
  if (!quiz || !attempt || attempt.userId !== me.id || attempt.status === 'in_progress') return <NotFound />
  const course = look.course(quiz.courseId)!
  const pending = attempt.status === 'pending_review'
  const ok = passed(quiz, attempt)
  // Correct answers are revealed only as the quiz's review policy allows.
  const showReview = !pending && (quiz.review === 'after_submit' || (quiz.review === 'after_pass' && ok))
  const retake = !attemptBlocker(quiz, data.attempts, me.id, today())
  const lesson = allLessons(course).find((l) => l.quizId === quiz.id)
  const took = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime() : 0

  return (
    <div className="mx-auto max-w-[880px]">
      <Link to={`/learn/quizzes/${quiz.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />{quiz.title}</Link>
      <div className="panel flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center">
        <ProgressRing value={pending ? 0 : pct(attempt)} size={104} stroke={9} label="Score">
          <span className="text-lg">{pending ? '—' : `${Math.round(pct(attempt))}%`}</span>
        </ProgressRing>
        <div className="flex-1">
          <p className="flex items-center gap-2 text-xl font-semibold">
            {pending ? <><Hourglass className="size-5 text-secondary" />Waiting for grading</> : ok ? <><CircleCheck className="size-5 text-success" />Passed</> : <><CircleX className="size-5 text-danger" />Not passed</>}
          </p>
          <p className="mt-1 text-muted">
            {pending ? 'Your multiple-choice answers are scored. Your instructor still needs to grade the written answers — you’ll get a notification.' : `You scored ${attempt.score} of ${attempt.maxScore} points. The pass mark is ${quiz.passingScore}%.`}
          </p>
          <p className="mt-1 text-xs text-faint">Time taken {formatDuration(took)} · submitted {new Date(attempt.submittedAt!).toLocaleString()}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lesson && <ButtonLink variant="primary" to={`/learn/course/${course.id}/${lesson.id}`}>Back to the lesson</ButtonLink>}
            {retake && !ok && <ButtonLink to={`/learn/quizzes/${quiz.id}`} icon={<RotateCcw />}>Try again</ButtonLink>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        {showReview ? (
          <Section title="Review your answers">
            <ol className="space-y-8">
              {quiz.questions.map((q, i) => (
                <li key={q.id}><QuestionView q={q} index={i} answer={attempt.answers[q.id] ?? []} review manualPoints={attempt.manualPoints[q.id]} /></li>
              ))}
            </ol>
          </Section>
        ) : (
          <Section title="Answer review">
            <p className="text-sm text-muted">{pending ? 'The review opens once grading is finished.' : quiz.review === 'never' ? 'Your instructor has chosen not to show answers for this quiz.' : 'Correct answers are shown once you pass.'}</p>
          </Section>
        )}
        <Section title="All attempts"><AttemptHistory quiz={quiz} attempts={data.attempts.filter((a) => a.quizId === quiz.id && a.userId === me.id)} /></Section>
      </div>
    </div>
  )
}
