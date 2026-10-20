import { useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader, Section } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { addDays, addMonths, dateOf, daysInMonth, formatDate, parseDate, startOfMonth, startOfWeek, today } from '@/lib/date'
import { studentTasks, taskStatusMeta } from '@/services/tasks'
import { useLookup, useMe } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function CalendarPage() {
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const t = today()
  const [month, setMonth] = useState(startOfMonth(t))
  const tasks = studentTasks(data, me.id, t).filter((x) => x.due)
  const studied = new Map<string, number>()
  for (const e of data.events) if (e.userId === me.id) studied.set(dateOf(e.at), (studied.get(dateOf(e.at)) ?? 0) + e.minutes)
  const terms = data.settings.academic.terms ? data.terms.filter((x) => x.status !== 'archived') : []
  const gridStart = startOfWeek(month)
  const cells = Array.from({ length: Math.ceil((daysInMonth(month) + (parseDate(month).getDay() + 6) % 7) / 7) * 7 }, (_, i) => addDays(gridStart, i))
  const monthEnd = addDays(month, daysInMonth(month) - 1)
  const agenda = tasks.filter((x) => x.due! >= month && x.due! <= monthEnd)
  const termMarks = (d: string) => terms.filter((x) => x.start === d || x.end === d).map((x) => `${x.name} ${x.start === d ? 'starts' : 'ends'}`)

  return (
    <div>
      <PageHeader
        title="Learning Calendar"
        description="Deadlines from your active courses, term dates and the days you studied."
        actions={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Previous month" icon={<ChevronLeft />} onClick={() => setMonth(addMonths(month, -1))} />
            <Button onClick={() => setMonth(startOfMonth(t))}>Today</Button>
            <Button size="icon" variant="ghost" aria-label="Next month" icon={<ChevronRight />} onClick={() => setMonth(addMonths(month, 1))} />
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Section title={parseDate(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} bodyClassName="px-0 pb-0">
          <div className="hidden md:block">
            <div className="grid grid-cols-7 border-y border-line text-center text-xs font-medium text-faint">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((d) => {
                const items = tasks.filter((x) => x.due === d)
                const mins = studied.get(d)
                const marks = termMarks(d)
                return (
                  <div key={d} className={cn('min-h-28 border-r border-b border-line p-1.5 [&:nth-child(7n)]:border-r-0', d.slice(0, 7) !== month.slice(0, 7) && 'bg-surface-2/60')}>
                    <div className="flex items-center justify-between px-1">
                      <span className={cn('grid size-6 place-items-center rounded-full text-xs tabular', d === t ? 'bg-primary font-semibold text-primary-ink' : d.slice(0, 7) === month.slice(0, 7) ? 'text-ink' : 'text-faint')}>{parseDate(d).getDate()}</span>
                      {mins ? <span className="size-1.5 rounded-full bg-success" title={`Studied ${mins} min`} aria-label={`Studied ${mins} minutes`} /> : null}
                    </div>
                    <ul className="mt-1 space-y-1">
                      {marks.map((m) => <li key={m} className="truncate rounded px-1.5 py-0.5 text-[11px] text-muted bg-surface-3">{m}</li>)}
                      {items.map((x) => (
                        <li key={x.id}>
                          <Link to={x.link} className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium hover:underline" style={{ background: `color-mix(in oklab, ${taskStatusMeta[x.status].color} 14%, transparent)`, color: `color-mix(in oklab, ${taskStatusMeta[x.status].color} 75%, var(--ink))` }} title={`${x.title} · ${taskStatusMeta[x.status].label}`}>
                            {x.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="px-5 py-3 text-xs text-faint"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-success align-middle" />Days you studied</p>
        </Section>

        <Section title={`Due in ${parseDate(month).toLocaleDateString(undefined, { month: 'long' })}`}>
          {agenda.length ? (
            <ul className="space-y-3">
              {agenda.map((x) => (
                <li key={x.id}>
                  <Link to={x.link} className="flex gap-3 rounded-[var(--r-ctl)] p-2 hover:bg-surface-2">
                    <span className="w-12 shrink-0 text-center">
                      <span className="block text-xs text-muted">{parseDate(x.due!).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      <span className="block font-display text-xl font-semibold tabular">{parseDate(x.due!).getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{x.title}</span>
                      <span className="block truncate text-xs text-muted">{look.course(x.courseId)?.title}</span>
                      <Badge className="mt-1" color={taskStatusMeta[x.status].color}>{taskStatusMeta[x.status].label}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CalendarDays />} title="No deadlines this month" body={`Nothing is due between ${formatDate(month)} and ${formatDate(monthEnd)}.`} className="py-8" />
          )}
        </Section>
      </div>
    </div>
  )
}
