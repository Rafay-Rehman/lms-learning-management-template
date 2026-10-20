import { useState } from 'react'
import { Link } from 'react-router'
import { Bookmark, Download, History } from 'lucide-react'
import { CourseArt } from '@/components/courses/CourseArt'
import { Progress, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader, Section, Tabs } from '@/components/ui/misc'
import { downloadCsv } from '@/lib/csv'
import { formatDate, formatMinutes, timeAgo } from '@/lib/date'
import { allLessons, enrollmentStatusMeta, progressOf } from '@/services/learning'
import { useLookup, useMe, useMyEnrollments } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function HistoryPage() {
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const mine = useMyEnrollments()
  const [tab, setTab] = useState<'courses' | 'activity' | 'bookmarks'>('courses')
  const events = data.events.filter((e) => e.userId === me.id).sort((a, b) => b.at.localeCompare(a.at))
  const bookmarks = mine.flatMap((e) => e.bookmarks.map((id) => ({ e, lesson: allLessons(e.course).find((l) => l.id === id) }))).filter((b) => b.lesson)

  const exportCsv = () =>
    downloadCsv(`learning-record-${me.name.toLowerCase().replace(/\W+/g, '-')}.csv`, [
      ['Course', 'Status', 'Progress %', 'Enrolled', 'Completed', 'Certificate'],
      ...mine.map((e) => [e.course.title, e.status, progressOf(e.course, e), e.enrolledAt.slice(0, 10), e.completedAt?.slice(0, 10) ?? '', data.certificates.find((c) => c.enrollmentId === e.id)?.code ?? '']),
    ])

  return (
    <div>
      <PageHeader title="Learning History" description="Every course you’ve joined, what you did and when." actions={<Button icon={<Download />} onClick={exportCsv} disabled={!mine.length}>Export my record (CSV)</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'courses', label: 'Courses', count: mine.length }, { value: 'activity', label: 'Activity', count: events.length }, { value: 'bookmarks', label: 'Bookmarks', count: bookmarks.length }]} />
      <div className="pt-5">
        {tab === 'courses' &&
          (mine.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {mine.map((e) => {
                const p = progressOf(e.course, e)
                const cert = data.certificates.find((c) => c.enrollmentId === e.id)
                return (
                  <article key={e.id} className="panel flex gap-4 overflow-hidden p-3">
                    <CourseArt course={e.course} className="aspect-square w-24 shrink-0 rounded-[var(--r-ctl)]" showIcon={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/learn/course/${e.course.id}/overview`} className="font-medium leading-snug hover:text-primary">{e.course.title}</Link>
                        <StatusBadge meta={enrollmentStatusMeta[e.status]} />
                      </div>
                      <div className="mt-2 flex items-center gap-2"><Progress value={p} label={`${e.course.title} progress`} /><span className="text-xs font-medium tabular">{p}%</span></div>
                      <p className="mt-2 text-xs text-muted">Enrolled {formatDate(e.enrolledAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}{e.completedAt && ` · completed ${formatDate(e.completedAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}`}</p>
                      {cert && <Link to={`/learn/certificates/${cert.id}`} className="mt-1 inline-block text-xs font-medium text-link hover:underline">Certificate {cert.code}</Link>}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<History />} title="No courses yet" />
          ))}
        {tab === 'activity' && (
          <Section title="Recent activity">
            {events.length ? (
              <ol className="relative space-y-4 border-l border-line pl-5">
                {events.slice(0, 60).map((ev) => {
                  const c = look.course(ev.courseId)
                  const l = c && ev.lessonId ? allLessons(c).find((x) => x.id === ev.lessonId) : undefined
                  return (
                    <li key={ev.id} className="relative">
                      <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface bg-primary" />
                      <p className="text-sm"><span className="font-medium">{ev.kind === 'lesson' ? 'Completed' : ev.kind === 'quiz' ? (l ? 'Passed quiz' : 'Took a quiz') : ev.kind === 'assignment' ? 'Submitted an assignment' : 'Study session'}</span>{l && <> · {l.title}</>}</p>
                      <p className="text-xs text-muted">{c?.title} · {formatMinutes(ev.minutes)} · {timeAgo(ev.at)}</p>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <EmptyState icon={<History />} title="No activity yet" />
            )}
          </Section>
        )}
        {tab === 'bookmarks' &&
          (bookmarks.length ? (
            <ul className="panel divide-y divide-line">
              {bookmarks.map(({ e, lesson }) => (
                <li key={e.id + lesson!.id}>
                  <Link to={`/learn/course/${e.course.id}/${lesson!.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <Bookmark className="size-4 fill-highlight text-highlight" />
                    <span className="flex-1"><span className="block text-sm font-medium">{lesson!.title}</span><span className="block text-xs text-muted">{e.course.title}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Bookmark />} title="No bookmarks" body="Use the bookmark button on any lesson to save it here." />
          ))}
      </div>
    </div>
  )
}
