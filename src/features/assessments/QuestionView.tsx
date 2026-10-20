import { Check, X } from 'lucide-react'
import type { Question } from '@/types'
import { questionTypeLabel, scoreQuestion } from '@/services/assessment'
import { cn } from '@/lib/cn'
import { Textarea } from '@/components/ui/Field'

/**
 * One question, in answer mode (onChange given) or review mode (`review`).
 * Correct answers are only passed in when the review policy allows it.
 */
export function QuestionView({ q, index, answer, onChange, review, manualPoints }: { q: Question; index: number; answer: string[]; onChange?: (a: string[]) => void; review?: boolean; manualPoints?: number }) {
  const multi = q.type === 'multiple'
  const earned = review ? (q.type === 'short' && !q.correct.length ? manualPoints ?? null : scoreQuestion(q, answer)) : null
  return (
    <fieldset className="min-w-0">
      <legend className="w-full">
        <span className="text-sm text-muted">Question {index + 1} · {questionTypeLabel[q.type]} · {q.points} point{q.points === 1 ? '' : 's'}{multi && ' · select all that apply'}</span>
        <span className="mt-1.5 block font-display text-xl leading-snug font-semibold text-ink">{q.text}</span>
      </legend>
      <div className="mt-5 space-y-2">
        {q.type === 'short' ? (
          review ? (
            <div className="rounded-[var(--r-ctl)] border border-line bg-surface-2 p-3 text-sm whitespace-pre-line">{answer[0] || <span className="text-faint">No answer</span>}</div>
          ) : (
            <Textarea aria-label="Your answer" value={answer[0] ?? ''} onChange={(e) => onChange?.(e.target.value ? [e.target.value] : [])} maxLength={2000} placeholder="Type your answer" className="min-h-28" />
          )
        ) : (
          q.options.map((o) => {
            const chosen = answer.includes(o.id)
            const correct = review && q.correct.includes(o.id)
            return (
              <label
                key={o.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-[var(--r-ctl)] border px-4 py-3 text-[15px] transition-colors',
                  review ? 'cursor-default' : 'hover:border-primary/50',
                  chosen && !review && 'border-primary bg-primary-soft',
                  review && correct && 'border-success/60 bg-success/8',
                  review && chosen && !correct && 'border-danger/60 bg-danger/8',
                  !chosen && !(review && correct) && 'border-line',
                )}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={q.id}
                  checked={chosen}
                  disabled={review}
                  onChange={() => onChange?.(multi ? (chosen ? answer.filter((x) => x !== o.id) : [...answer, o.id]) : [o.id])}
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="flex-1">{o.text}</span>
                {review && correct && <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Check className="size-4" />Correct answer</span>}
                {review && chosen && !correct && <span className="inline-flex items-center gap-1 text-xs font-medium text-danger"><X className="size-4" />Your answer</span>}
              </label>
            )
          })
        )}
      </div>
      {review && (
        <div className="mt-4 rounded-[var(--r-ctl)] bg-surface-2 p-4 text-sm">
          <p className="font-medium">
            {earned === null ? 'Waiting for your instructor to grade this answer' : `${earned} / ${q.points} point${q.points === 1 ? '' : 's'}`}
            {q.type === 'short' && q.correct.length > 0 && <span className="ml-2 font-normal text-muted">Accepted: {q.correct.join(', ')}</span>}
          </p>
          {q.explanation && <p className="mt-1 text-muted">{q.explanation}</p>}
        </div>
      )}
    </fieldset>
  )
}
