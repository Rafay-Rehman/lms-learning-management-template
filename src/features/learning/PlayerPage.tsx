import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, CircleCheck, Download, ExternalLink, ListTree, Lock, Megaphone, MessageSquare, NotebookPen, Pin, X } from 'lucide-react'
import type { Course, Enrollment, Lesson } from '@/types'
import { useDemoSwitcher } from '@/components/layout/DemoSwitcher'
import { Avatar, Progress, ProgressRing } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { EmptyState, Tabs } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { lessonIcon, lessonTypeLabel } from '@/features/public/CourseDetailPage'
import { cn } from '@/lib/cn'
import { formatMinutes, timeAgo } from '@/lib/date'
import { isSafeUrl } from '@/services/courses'
import { allLessons, bestAttempt, canCompleteLesson, courseMinutes, isComplete, nextLesson, passed, pct, progressOf } from '@/services/learning'
import { canEditCourse, roleHome } from '@/services/permissions'
import { useLookup, useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { LessonContent } from './LessonContent'

function Curriculum({ course, enrollment, current, onPick }: { course: Course; enrollment?: Enrollment; current?: string; onPick?: () => void }) {
  return (
    <nav aria-label="Course curriculum" className="space-y-4">
      <Link to={`/learn/course/${course.id}/overview`} onClick={onPick} className={cn('flex items-center gap-2 rounded-[var(--r-ctl)] px-3 py-2 text-sm font-medium', current === 'overview' ? 'bg-primary-soft text-primary' : 'hover:bg-surface-3')}>
        <ListTree className="size-4" /> Course overview
      </Link>
      {course.sections.map((s, si) => {
        const done = s.lessons.filter((l) => enrollment?.progress[l.id]).length
        return (
          <div key={s.id}>
            <div className="flex items-baseline justify-between gap-2 px-3 pb-1.5">
              <p className="text-xs font-semibold text-muted">Section {si + 1} · {s.title}</p>
              <span className="shrink-0 text-[11px] text-faint tabular">{done}/{s.lessons.length}</span>
            </div>
            <ol className="space-y-0.5">
              {s.lessons.map((l) => {
                const Icon = lessonIcon[l.type]
                const complete = !!enrollment?.progress[l.id]
                const active = l.id === current
                return (
                  <li key={l.id}>
                    <Link to={`/learn/course/${course.id}/${l.id}`} onClick={onPick} aria-current={active ? 'page' : undefined} className={cn('flex items-start gap-2.5 rounded-[var(--r-ctl)] px-3 py-2 text-sm', active ? 'bg-primary-soft' : 'hover:bg-surface-3')}>
                      <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border', complete ? 'border-success bg-success text-white' : active ? 'border-primary text-primary' : 'border-line-strong text-faint')}>
                        {complete ? <Check className="size-3" strokeWidth={3} aria-label="Completed" /> : <Icon className="size-3" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block leading-snug', active ? 'font-medium text-ink' : complete ? 'text-muted' : 'text-ink')}>{l.title}</span>
                        <span className="text-xs text-faint">{lessonTypeLabel[l.type]} · {l.durationMinutes} min{!l.required && ' · Optional'}</span>
                      </span>
                      {enrollment?.bookmarks.includes(l.id) && <Bookmark className="mt-0.5 size-3.5 shrink-0 fill-highlight text-highlight" aria-label="Bookmarked" />}
                    </Link>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </nav>
  )
}

function Discussion({ course, lesson, canPost }: { course: Course; lesson: Lesson; canPost: boolean }) {
  const { data, actions } = useStore()
  const look = useLookup()
  const me = useMe()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const posts = data.comments.filter((c) => c.lessonId === lesson.id)
  const threads = posts.filter((c) => !c.parentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const post = (text: string, parent: string | null) => {
    const r = actions.addComment(course.id, lesson.id, text, parent)
    if (!r.ok) return toast(Object.values(r.errors)[0], { tone: 'error' }), false
    toast(parent ? 'Reply posted' : 'Question posted')
    return true
  }
  const Post = ({ id, userId, body: text, createdAt, reply: isReply }: { id: string; userId: string; body: string; createdAt: string; reply?: boolean }) => {
    const u = look.user(userId)
    const staff = u?.id === course.instructorId
    return (
      <div className={cn('flex gap-3', isReply && 'mt-3 ml-11')}>
        {u && <Avatar user={u} size="sm" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-medium">{u?.name}</span>
            {staff && <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">Instructor</span>}
            <span className="ml-2 text-xs text-faint">{timeAgo(createdAt)}</span>
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-ink">{text}</p>
          {(userId === me.id || canEditCourse(me, course)) && (
            <button className="mt-1 text-xs text-faint hover:text-danger" onClick={() => actions.deleteComment(id)}>Delete</button>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {canPost && (
        <form onSubmit={(e) => (e.preventDefault(), post(body, null) && setBody(''))} className="space-y-2">
          <label htmlFor="q-body" className="text-sm font-medium">Ask a question about this lesson</label>
          <Textarea id="q-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Be specific — what did you try, and what happened?" maxLength={3000} />
          <Button type="submit" variant="primary" size="sm" disabled={!body.trim()}>Post question</Button>
        </form>
      )}
      {threads.length === 0 ? (
        <EmptyState icon={<MessageSquare />} title="No questions yet" body={canPost ? 'Be the first to ask — your instructor is notified.' : 'Questions from learners appear here.'} className="py-8" />
      ) : (
        <ul className="divide-y divide-line">
          {threads.map((t) => (
            <li key={t.id} className="py-4">
              <Post {...t} />
              {posts.filter((r) => r.parentId === t.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((r) => <Post key={r.id} {...r} reply />)}
              {canPost && (replyTo === t.id ? (
                <form className="mt-3 ml-11 space-y-2" onSubmit={(e) => (e.preventDefault(), post(reply, t.id) && (setReply(''), setReplyTo(null)))}>
                  <Textarea aria-label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-16" autoFocus />
                  <div className="flex gap-2"><Button type="submit" size="sm" variant="primary" disabled={!reply.trim()}>Reply</Button><Button size="sm" onClick={() => setReplyTo(null)}>Cancel</Button></div>
                </form>
              ) : (
                <button className="mt-2 ml-11 text-xs font-medium text-link hover:underline" onClick={() => setReplyTo(t.id)}>Reply</button>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Notes({ enrollment, lessonId }: { enrollment: Enrollment; lessonId: string }) {
  const { actions } = useStore()
  const toast = useToast()
  const saved = enrollment.notes[lessonId] ?? ''
  const [text, setText] = useState(saved)
  useEffect(() => setText(saved), [lessonId]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = text !== saved
  return (
    <form className="space-y-2" onSubmit={(e) => {
      e.preventDefault()
      const r = actions.saveNote(enrollment.id, lessonId, text)
      r.ok ? toast('Notes saved') : toast(Object.values(r.errors)[0], { tone: 'error' })
    }}>
      <label htmlFor="notes" className="text-sm font-medium">Your private notes for this lesson</label>
      <Textarea id="notes" value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" maxLength={5000} placeholder="Key ideas, questions to ask, things to try…" />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={!dirty}>Save notes</Button>
        <span className="text-xs text-faint">{dirty ? 'Unsaved changes' : saved ? 'Saved' : ''} · Stored in this browser</span>
      </div>
    </form>
  )
}

function Overview({ course, enrollment }: { course: Course; enrollment?: Enrollment }) {
  const { data } = useStore()
  const look = useLookup()
  const instructor = look.user(course.instructorId)
  const news = data.announcements.filter((a) => a.courseId === course.id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
  const p = progressOf(course, enrollment)
  const req = allLessons(course).filter((l) => l.required)
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProgressRing value={p} size={84} stroke={7} label="Course progress" />
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="mt-1 text-muted">{req.filter((l) => enrollment?.progress[l.id]).length} of {req.length} required lessons complete · {formatMinutes(courseMinutes(course))} of material</p>
          {enrollment?.status === 'completed' && <p className="mt-1 text-sm font-medium text-success">Course completed</p>}
        </div>
      </div>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Megaphone className="size-5 text-highlight" />Announcements</h2>
        {news.length ? (
          <ul className="space-y-3">
            {news.map((a) => (
              <li key={a.id} className="panel p-4">
                <p className="flex items-center gap-2 font-medium">{a.pinned && <Pin className="size-3.5 text-highlight" aria-label="Pinned" />}{a.title}</p>
                <p className="mt-1 text-sm text-muted">{a.body}</p>
                <p className="mt-2 text-xs text-faint">{look.user(a.authorId)?.name} · {timeAgo(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No announcements yet.</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">About this course</h2>
        <p className="max-w-[68ch] leading-relaxed">{course.description}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">{course.objectives.map((o) => <li key={o} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" />{o}</li>)}</ul>
      </section>
      {instructor && (
        <section className="flex gap-4">
          <Avatar user={instructor} size="lg" />
          <div>
            <p className="font-medium">{instructor.name}</p>
            <p className="text-sm text-muted">{instructor.title}</p>
            <p className="mt-1 max-w-[62ch] text-sm">{instructor.bio}</p>
          </div>
        </section>
      )}
    </div>
  )
}

export default function PlayerPage() {
  const { courseId, lessonId = 'overview' } = useParams()
  const { data, actions } = useStore()
  const look = useLookup()
  const me = useMe()
  const toast = useToast()
  const navigate = useNavigate()
  const switcher = useDemoSwitcher()
  const [drawer, setDrawer] = useState(false)
  const [tab, setTab] = useState<'notes' | 'resources' | 'discussion'>('discussion')
  const course = look.course(courseId)
  const enrollment = useMemo(() => data.enrollments.filter((e) => e.userId === me.id && e.courseId === courseId && e.status !== 'cancelled').sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))[0], [data.enrollments, me.id, courseId])
  const lessons = course ? allLessons(course) : []
  const index = lessons.findIndex((l) => l.id === lessonId)
  const lesson = lessons[index]
  const staff = !!course && canEditCourse(me, course)
  const studying = enrollment && (enrollment.status === 'active' || enrollment.status === 'completed')

  useEffect(() => setDrawer(false), [lessonId])
  useEffect(() => {
    window.scrollTo(0, 0)
    if (lesson && enrollment?.status === 'active') actions.openLesson(enrollment.id, lesson.id)
  }, [lesson?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!course || (lessonId !== 'overview' && !lesson))
    return <div className="p-10"><EmptyState icon={<X />} title="Lesson not found" body="It may have been removed from the course." action={<ButtonLink to={roleHome[me.role]}>Back to dashboard</ButtonLink>} /></div>

  if (!studying && !staff) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <EmptyState
          icon={<Lock />}
          title={enrollment?.status === 'suspended' ? 'Your enrollment is suspended' : 'Enroll to open this lesson'}
          body={me.role === 'student' ? (enrollment?.status === 'suspended' ? 'Contact your instructor to restore access.' : `Lessons in ${course.title} are available to enrolled students.`) : 'Switch to a student account, or open the course in the builder.'}
          action={me.role === 'student' ? <ButtonLink variant="primary" to={`/learn/explore/${course.slug}`}>View course</ButtonLink> : <Button variant="primary" onClick={() => switcher('student')}>Switch account</Button>}
        />
      </div>
    )
  }

  const pctDone = progressOf(course, enrollment)
  const prev = lessons[index - 1]
  const next = lessonId === 'overview' ? nextLesson(course, enrollment) : lessons[index + 1]
  const done = !!(lesson && enrollment?.progress[lesson.id])
  const quiz = lesson?.quizId ? look.quiz(lesson.quizId) : undefined
  const check = lesson && enrollment ? canCompleteLesson(data, data.settings, lesson, me.id) : { ok: false }
  const best = quiz && bestAttempt(data.attempts, quiz.id, me.id)
  const suggested = done ? nextLesson(course, enrollment) : undefined
  const bookmarked = !!(lesson && enrollment?.bookmarks.includes(lesson.id))
  const section = lesson && course.sections.find((s) => s.lessons.some((l) => l.id === lesson.id))

  const complete = () => {
    if (!enrollment || !lesson) return
    const wasCompleted = enrollment.status === 'completed'
    const r = actions.completeLesson(enrollment.id, lesson.id)
    if (!r.ok) return toast(Object.values(r.errors)[0], { tone: 'error' })
    const progress = { ...enrollment.progress, [lesson.id]: 'now' }
    if (!wasCompleted && isComplete(course, { progress })) {
      toast(course.awardsCertificate ? 'Course complete — your certificate has been issued' : 'Course complete — well done!', course.awardsCertificate ? { action: { label: 'View', onClick: () => navigate('/learn/certificates') } } : undefined)
      return
    }
    toast('Lesson complete')
    if (!wasCompleted) {
      const fresh = nextLesson(course, { ...enrollment, progress })
      if (fresh && fresh.id !== lesson.id && !enrollment.progress[fresh.id]) toast(`Up next: ${fresh.title}`, { tone: 'info', action: { label: 'Open', onClick: () => navigate(`/learn/course/${course.id}/${fresh.id}`) } })
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="glass glass-header sticky top-0 z-30 border-b border-line">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link to={staff && me.role !== 'student' ? (me.role === 'admin' ? `/admin/builder?course=${course.id}` : `/teach/builder?course=${course.id}`) : '/learn'} className="grid size-9 place-items-center rounded-[var(--r-ctl)] text-muted hover:bg-surface-3 hover:text-ink" aria-label={staff && me.role !== 'student' ? 'Back to course builder' : 'Back to My Learning'}>
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold">{course.title}</p>
            {enrollment && (
              <div className="flex max-w-xs items-center gap-2">
                <Progress value={pctDone} label="Course progress" className="h-1" />
                <span className="shrink-0 text-xs text-muted tabular">{pctDone}%</span>
              </div>
            )}
            {!enrollment && <p className="text-xs text-warning">Staff preview — progress isn’t recorded</p>}
          </div>
          <Button variant="secondary" size="sm" className="lg:hidden" icon={<ListTree />} onClick={() => setDrawer(true)} aria-label="Show curriculum">Lessons</Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
          <div className="mx-auto max-w-[900px]">
            {lessonId === 'overview' || !lesson ? (
              <>
                <Overview course={course} enrollment={enrollment} />
                {next && <div className="mt-8"><ButtonLink variant="primary" to={`/learn/course/${course.id}/${next.id}`}>{pctDone ? 'Continue' : 'Start'}: {next.title}</ButtonLink></div>}
              </>
            ) : (
              <>
                <p className="text-sm text-muted">{section?.title} · Lesson {index + 1} of {lessons.length}</p>
                <div className="mt-1 flex items-start gap-3">
                  <h1 className="flex-1 text-[1.75rem] leading-tight font-semibold">{lesson.title}</h1>
                  {enrollment && (
                    <Button variant="ghost" size="icon" aria-pressed={bookmarked} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark lesson'} onClick={() => (actions.toggleBookmark(enrollment.id, lesson.id), toast(bookmarked ? 'Bookmark removed' : 'Lesson bookmarked'))} icon={bookmarked ? <BookmarkCheck className="text-highlight" /> : <Bookmark />} />
                  )}
                </div>
                <p className="mt-1 mb-6 text-sm text-faint">{lessonTypeLabel[lesson.type]} · {lesson.durationMinutes} min · {lesson.required ? 'Required' : 'Optional'}</p>

                <LessonContent
                  lesson={lesson}
                  quiz={quiz}
                  quizAction={quiz && (me.role === 'student' ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <ButtonLink variant="primary" to={`/learn/quizzes/${quiz.id}`}>{best ? 'Open quiz' : 'Start quiz'}</ButtonLink>
                      {best && <span className="text-sm text-muted">Best score {Math.round(pct(best))}% · {passed(quiz, best) ? <span className="text-success">Passed</span> : 'Not passed yet'}</span>}
                    </div>
                  ) : <span className="text-sm text-muted">Students take this quiz from the lesson.</span>)}
                />

                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                  {prev ? <ButtonLink to={`/learn/course/${course.id}/${prev.id}`} icon={<ChevronLeft />}>Previous</ButtonLink> : <span />}
                  <div className="flex-1" />
                  {enrollment && (done ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success"><CircleCheck className="size-5" />Completed</span>
                  ) : enrollment.status === 'active' ? (
                    <Button variant="primary" icon={<Check />} onClick={complete} disabled={!check.ok} title={check.ok ? undefined : check.reason}>Mark as complete</Button>
                  ) : null)}
                  {next && <ButtonLink to={`/learn/course/${course.id}/${next.id}`} variant={done ? 'primary' : 'secondary'}>Next <ChevronRight className="size-4" /></ButtonLink>}
                </div>
                {enrollment && !done && !check.ok && 'reason' in check && <p className="mt-2 text-right text-xs text-muted">{check.reason}</p>}
                {suggested && suggested.id !== lesson.id && !enrollment?.progress[suggested.id] && (
                  <Link to={`/learn/course/${course.id}/${suggested.id}`} className="panel mt-5 flex items-center gap-3 p-4 hover:border-primary/40">
                    <span className="text-sm text-muted">Next incomplete lesson</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{suggested.title}</span>
                    <ChevronRight className="size-4 text-faint" />
                  </Link>
                )}
                {enrollment?.status === 'completed' && <p className="panel mt-5 p-4 text-sm"><span className="font-medium text-success">You’ve completed this course.</span> Revisit any lesson — your progress is kept. {data.certificates.some((c) => c.enrollmentId === enrollment.id) && <Link to="/learn/certificates" className="link">View your certificate</Link>}</p>}

                <div className="mt-10">
                  <Tabs value={tab} onChange={setTab} tabs={[{ value: 'discussion', label: 'Q&A', count: data.comments.filter((c) => c.lessonId === lesson.id).length }, ...(enrollment ? [{ value: 'notes' as const, label: 'Notes' }] : []), { value: 'resources', label: 'Resources', count: lesson.resources.length }]} />
                  <div className="pt-5" role="tabpanel">
                    {tab === 'notes' && enrollment && <Notes enrollment={enrollment} lessonId={lesson.id} />}
                    {tab === 'discussion' && <Discussion course={course} lesson={lesson} canPost={!!studying || staff} />}
                    {tab === 'resources' && (lesson.resources.length ? (
                      <ul className="space-y-2">
                        {lesson.resources.filter((r) => isSafeUrl(r.url)).map((r) => (
                          <li key={r.id}>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" download={r.kind === 'file' ? '' : undefined} className="flex items-center gap-3 rounded-[var(--r-ctl)] border border-line p-3 hover:border-primary/40">
                              {r.kind === 'file' ? <Download className="size-4 text-primary" /> : <ExternalLink className="size-4 text-primary" />}
                              <span className="flex-1 text-sm font-medium">{r.title}</span>
                              <span className="text-xs text-faint">{r.kind === 'file' ? `Download${r.size ? ` · ${r.size}` : ''}` : 'Opens in a new tab'}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : <EmptyState icon={<NotebookPen />} title="No resources for this lesson" className="py-8" />)}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[340px] shrink-0 overflow-y-auto border-l border-line bg-surface px-3 py-5 scroll-thin lg:block">
          <Curriculum course={course} enrollment={enrollment} current={lessonId} />
        </aside>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Course curriculum" onKeyDown={(e) => e.key === 'Escape' && setDrawer(false)}>
          <div className="absolute inset-0 animate-fade bg-[rgb(10_12_30/0.5)]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[340px] max-w-[90vw] animate-slide flex-col bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-semibold">Lessons</p>
              <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setDrawer(false)} icon={<X />} autoFocus />
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-2 py-4"><Curriculum course={course} enrollment={enrollment} current={lessonId} onPick={() => setDrawer(false)} /></div>
          </div>
        </div>
      )}
    </div>
  )
}
