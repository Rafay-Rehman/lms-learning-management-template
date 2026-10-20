import { Plus, X } from 'lucide-react'
import type { Question, QuestionType } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { questionProblem, questionTypeLabel } from '@/services/assessment'
import { uid } from '@/state/actions'

export function blankQuestion(type: QuestionType = 'single'): Question {
  const id = uid('q')
  const options = type === 'true_false' ? [{ id: uid('o'), text: 'True' }, { id: uid('o'), text: 'False' }] : type === 'short' ? [] : [{ id: uid('o'), text: '' }, { id: uid('o'), text: '' }]
  return { id, type, text: '', options, correct: [], explanation: '', points: 1, sourceId: null }
}

/** Editor for one question's text, options, correct answers, points and explanation. */
export function QuestionEditor({ q, onChange, showProblem = true }: { q: Question; onChange: (q: Question) => void; showProblem?: boolean }) {
  const set = (p: Partial<Question>) => onChange({ ...q, ...p })
  const changeType = (type: QuestionType) => {
    if (type === q.type) return
    const fresh = blankQuestion(type)
    // Keep typed options when moving between choice types.
    const keep = (type === 'single' || type === 'multiple') && (q.type === 'single' || q.type === 'multiple')
    set({ type, options: keep ? q.options : fresh.options, correct: keep ? (type === 'single' ? q.correct.slice(0, 1) : q.correct) : [] })
  }
  const problem = showProblem ? questionProblem(q) : null
  const multi = q.type === 'multiple'
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_180px_110px]">
      <Field label="Question" required className="sm:col-span-1">{(p) => <Textarea {...p} value={q.text} onChange={(e) => set({ text: e.target.value })} className="min-h-16" />}</Field>
      <Field label="Type">{(p) => <Select {...p} value={q.type} onChange={(e) => changeType(e.target.value as QuestionType)}>{(Object.keys(questionTypeLabel) as QuestionType[]).map((t) => <option key={t} value={t}>{questionTypeLabel[t]}</option>)}</Select>}</Field>
      <Field label="Points">{(p) => <Input {...p} type="number" min={1} max={100} value={q.points} onChange={(e) => set({ points: Number(e.target.value) })} />}</Field>
      <div className="sm:col-span-3">
        {q.type === 'short' ? (
          <Field label="Accepted answers" hint="Separate with commas; matching ignores case and extra spaces. Leave empty to grade answers by hand.">
            {(p) => <Input {...p} value={q.correct.join(', ')} onChange={(e) => set({ correct: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="e.g. dtype" />}
          </Field>
        ) : (
          <fieldset>
            <legend className="text-[13px] font-medium">Answer options <span className="font-normal text-muted">— {multi ? 'tick every correct option' : 'select the correct option'}</span></legend>
            <ul className="mt-1.5 space-y-2">
              {q.options.map((o, i) => {
                const correct = q.correct.includes(o.id)
                return (
                  <li key={o.id} className="flex items-center gap-2">
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`correct-${q.id}`}
                      checked={correct}
                      aria-label={`Mark option ${i + 1} correct`}
                      onChange={() => set({ correct: multi ? (correct ? q.correct.filter((c) => c !== o.id) : [...q.correct, o.id]) : [o.id] })}
                      className="size-4 shrink-0 accent-[var(--success)]"
                    />
                    <Input aria-label={`Option ${i + 1}`} value={o.text} disabled={q.type === 'true_false'} className={cn(correct && 'border-success/60')} onChange={(e) => set({ options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
                    {q.type !== 'true_false' && <Button variant="ghost" size="icon" aria-label={`Remove option ${i + 1}`} disabled={q.options.length <= 2} icon={<X />} onClick={() => set({ options: q.options.filter((x) => x.id !== o.id), correct: q.correct.filter((c) => c !== o.id) })} />}
                  </li>
                )
              })}
            </ul>
            {q.type !== 'true_false' && q.options.length < 8 && <Button size="sm" variant="ghost" className="mt-2" icon={<Plus />} onClick={() => set({ options: [...q.options, { id: uid('o'), text: '' }] })}>Add option</Button>}
          </fieldset>
        )}
      </div>
      <Field label="Explanation" hint="Shown to students when answer review is allowed." className="sm:col-span-3">{(p) => <Textarea {...p} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} className="min-h-14" />}</Field>
      {problem && <p className="text-xs text-warning sm:col-span-3">To publish: {problem}.</p>}
    </div>
  )
}
