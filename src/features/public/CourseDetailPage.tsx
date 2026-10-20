import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Award, BookOpen, Check, ChevronDown, Clock, Eye, FileText, Film, Link2, ListChecks, Lock, PenSquare, Users } from 'lucide-react'
import type { Lesson, LessonType } from '@/types'
import { NotFound } from '@/app/App'
import { CourseArt } from '@/components/courses/CourseArt'
import { CourseCard, price, useCatalog } from '@/components/courses/CourseCard'
import { useDemoSwitcher } from '@/components/layout/DemoSwitcher'
import { Avatar, LevelTag, Progress, Stars } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { useToast } from '@/components/ui/Toast'
import { LessonContent } from '@/features/learning/LessonContent'
import { cn } from '@/lib/cn'
import { formatMinutes } from '@/lib/date'
import { canEditCourse } from '@/services/permissions'
import { courseMinutes, nextLesson, progressOf } from '@/services/learning'
import { useLookup, useMe } from '@/state/selectors'
import { useStore } from '@/state/store'

export const lessonIcon: Record<LessonType, typeof Film> = { video: Film, text: FileText, pdf: FileText, link: Link2, quiz: ListChecks }
export const lessonTypeLabel: Record<LessonType, string> = { video: 'Video', text: 'Reading', pdf: 'PDF', link: 'External resource', quiz: 'Quiz' }

export default function CourseDetailPage() {
  const { slug } = useParams()
  const { data, actions } = useStore()
  const look = useLookup()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const switcher = useDemoSwitcher()
  const [confirm, confirmDialog] = useConfirm()
  const { pathname } = useLocation()
  const inApp = pathname.startsWith('/learn')
  const [open, setOpen] = useState<Record<string, boolean>>({ 0: true })
  const [preview, setPreview] = useState<Lesson | null>(null)
  const course = look.courseBySlug(slug ?? '')
  const [entry] = useCatalog(course ? [course] : [])
  const relatedPool = useCatalog()

  const mine = entry?.mine
  const staff = course && canEditCourse(me, course)
  // Drafts and archived courses are only visible to staff and to students already enrolled.
  if (!course || !entry || (course.status !== 'published' && !staff && !mine)) return <NotFound />

  const instructor = look.user(course.instructorId)
  const cat = look.category(course.categoryId)
  const subject = look.subject(course.subjectId)
  const lessons = course.sections.flatMap((s) => s.lessons)
  const pct = mine ? progressOf(course, mine) : 0
  const studying = mine && (mine.status === 'active' || mine.status === 'completed')
  const next = nextLesson(course, mine)
  const reviews = data.reviews.filter((r) => r.courseId === course.id && r.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const related = relatedPool.filter((e) => e.course.id !== course.id && (e.course.categoryId === course.categoryId || e.course.subjectId === course.subjectId)).slice(0, 3)
  const base = inApp ? '/learn/explore' : '/courses'

  const enroll = () => {
    if (me.role !== 'student') return switcher('student')
    const doEnroll = () => {
      const r = actions.enroll(me.id, course.id)
      if (!r.ok) return toast(Object.values(r.errors)[0], { tone: 'error' })
      toast(`Enrolled in ${course.title}`)
      navigate(`/learn/course/${course.id}/${lessons[0]?.id ?? 'overview'}`)
    }
    if (course.price > 0) confirm({ title: 'Demo checkout', body: <>This course costs {price(course.price)}. This template has no payment gateway connected, so enrolling here takes <strong>no payment</strong>. Connect Stripe or another provider before selling courses.</>, confirmLabel: 'Enroll without paying (demo)', tone: 'primary', onConfirm: doEnroll })
    else doEnroll()
  }

  const action = studying ? (
    <ButtonLink variant="primary" to={`/learn/course/${course.id}/${next?.id ?? 'overview'}`} className="w-full justify-center">{pct === 0 ? 'Start learning' : mine?.status === 'completed' ? 'Review course' : 'Continue learning'}</ButtonLink>
  ) : mine?.status === 'suspended' ? (
    <p className="rounded-[var(--r-ctl)] bg-warning/10 p-3 text-sm">Your enrollment is suspended. Contact {instructor?.name ?? 'your instructor'} to restore access.</p>
  ) : course.status === 'published' ? (
    <Button variant="primary" className="w-full justify-center" onClick={enroll}>{me.role === 'student' ? (course.price ? `Enroll · ${price(course.price)}` : 'Enroll for free') : 'Switch to a student account to enroll'}</Button>
  ) : (
    <p className="text-sm text-muted">This course isn’t open for enrollment.</p>
  )

  return (
    <div className={cn(!inApp && 'mx-auto max-w-[1240px] px-4 py-8 sm:px-6')}>
      {course.status !== 'published' && (
        <p className="mb-4 rounded-[var(--r-ctl)] border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm">
          {staff ? `Staff preview — this course is ${course.status} and hidden from the catalog.` : 'This course is no longer listed in the catalog. You keep access because you’re enrolled.'}
        </p>
      )}
      <nav className="mb-4 text-sm text-muted" aria-label="Breadcrumb">
        <Link to={base} className="hover:text-ink">{inApp ? 'Explore' : 'Courses'}</Link> <span aria-hidden>/</span> <Link to={`${base}?category=${course.categoryId}`} className="hover:text-ink">{cat?.name}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <h1 className="text-[2rem] leading-tight font-semibold sm:text-[2.4rem]">{course.title}</h1>
          <p className="mt-3 max-w-[62ch] text-lg text-muted">{course.shortDescription}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <Stars value={entry.rating} count={entry.reviews} className="text-sm" />
            <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{entry.learners} learners</span>
            <LevelTag level={course.level} className="text-sm" />
            {subject && <span>{subject.code} · {subject.name}</span>}
          </div>
          {instructor && (
            <div className="mt-5 flex items-center gap-3">
              <Avatar user={instructor} size="lg" />
              <div>
                <p className="text-sm font-medium">{instructor.name}</p>
                <p className="text-xs text-muted">{instructor.title}</p>
              </div>
            </div>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-semibold">What you’ll learn</h2>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {course.objectives.map((o) => (
                <li key={o} className="flex gap-2.5 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" />{o}</li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">About this course</h2>
            <p className="mt-3 max-w-[68ch] leading-relaxed text-ink">{course.description}</p>
            {course.prerequisites.length > 0 && (
              <>
                <h3 className="mt-5 font-sans text-sm font-semibold">Before you start</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{course.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul>
              </>
            )}
          </section>

          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl font-semibold">Curriculum</h2>
              <p className="text-sm text-muted">{course.sections.length} sections · {lessons.length} lessons · {formatMinutes(courseMinutes(course))} of material</p>
            </div>
            <div className="panel mt-3 divide-y divide-line overflow-hidden">
              {course.sections.map((s, si) => (
                <div key={s.id}>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2" aria-expanded={!!open[si]} onClick={() => setOpen((o) => ({ ...o, [si]: !o[si] }))}>
                    <ChevronDown className={cn('size-4 text-faint transition-transform', !open[si] && '-rotate-90')} />
                    <span className="flex-1 font-medium">{s.title}</span>
                    <span className="text-xs text-muted">{s.lessons.length} lessons</span>
                  </button>
                  {open[si] && (
                    <ul className="pb-2">
                      {s.lessons.map((l) => {
                        const Icon = lessonIcon[l.type]
                        const done = mine?.progress[l.id]
                        return (
                          <li key={l.id} className="flex items-center gap-3 px-4 py-2 pl-11 text-sm">
                            {done ? <Check className="size-4 text-success" aria-label="Completed" /> : <Icon className="size-4 text-faint" aria-label={lessonTypeLabel[l.type]} />}
                            <span className="min-w-0 flex-1 truncate">{l.title}{!l.required && <span className="ml-2 text-xs text-faint">Optional</span>}</span>
                            {l.preview && !studying ? (
                              <button className="inline-flex items-center gap-1 text-xs font-medium text-link hover:underline" onClick={() => setPreview(l)}><Eye className="size-3.5" />Preview</button>
                            ) : !studying ? (
                              <Lock className="size-3.5 text-faint" aria-label="Enroll to unlock" />
                            ) : null}
                            <span className="w-12 text-right text-xs text-faint tabular">{l.durationMinutes}m</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          {instructor && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Your instructor</h2>
              <div className="panel mt-3 flex flex-col gap-4 p-5 sm:flex-row">
                <Avatar user={instructor} size="xl" />
                <div>
                  <p className="font-medium">{instructor.name}</p>
                  <p className="text-sm text-muted">{instructor.title}</p>
                  <p className="mt-2 max-w-[62ch] text-sm leading-relaxed">{instructor.bio}</p>
                  <p className="mt-2 text-xs text-muted">{instructor.expertise.join(' · ')}</p>
                </div>
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No reviews yet.</p>
            ) : (
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {reviews.slice(0, 6).map((r) => {
                  const u = look.user(r.userId)
                  return (
                    <li key={r.id} className="panel p-4">
                      <div className="flex items-center gap-2.5">
                        {u && <Avatar user={u} size="sm" />}
                        <span className="text-sm font-medium">{u?.name}</span>
                        <span className="ml-auto text-xs text-highlight" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="text-line-strong">{'★'.repeat(5 - r.rating)}</span></span>
                      </div>
                      <p className="mt-2 text-sm text-muted">{r.body}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="panel overflow-hidden">
            <CourseArt course={course} />
            <div className="space-y-4 p-5">
              <p className="font-display text-2xl font-semibold">{price(course.price)}</p>
              {studying && (
                <div>
                  <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted">Your progress</span><span className="font-semibold tabular">{pct}%</span></div>
                  <Progress value={pct} label="Your progress" />
                </div>
              )}
              {action}
              {staff && <ButtonLink to={me.role === 'admin' ? `/admin/builder?course=${course.id}` : `/teach/builder?course=${course.id}`} icon={<PenSquare />} className="w-full justify-center">Edit in course builder</ButtonLink>}
              <ul className="space-y-2.5 border-t border-line pt-4 text-sm">
                <li className="flex items-center gap-2.5"><Clock className="size-4 text-faint" />About {course.estimatedHours} hours to complete</li>
                <li className="flex items-center gap-2.5"><BookOpen className="size-4 text-faint" />{course.sections.length} sections, {lessons.length} lessons</li>
                {course.awardsCertificate && <li className="flex items-center gap-2.5"><Award className="size-4 text-faint" />Certificate on completion</li>}
                <li className="flex items-center gap-2.5"><Users className="size-4 text-faint" />{entry.learners} enrolled</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Related courses</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((e) => <CourseCard key={e.course.id} entry={e} to={`${base}/${e.course.slug}`} compact />)}</div>
        </section>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)} title={preview ? `Preview: ${preview.title}` : ''} size="lg">
        {preview && <div className="p-5"><LessonContent lesson={preview} /></div>}
      </Dialog>
      {confirmDialog}
    </div>
  )
}
