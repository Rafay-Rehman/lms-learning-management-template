import { useMemo } from 'react'
import { Link } from 'react-router'
import { BookOpen, Clock } from 'lucide-react'
import type { Course, Enrollment, User } from '@/types'
import { Avatar, Badge, LevelTag, Progress, Stars } from '@/components/ui/Badges'
import { cn } from '@/lib/cn'
import { ratingOf } from '@/services/analytics'
import { counts, lessonCount, nextLesson, progressOf } from '@/services/learning'
import { useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { CourseArt } from './CourseArt'

export interface CatalogEntry {
  course: Course
  instructor: User | undefined
  rating: number
  reviews: number
  learners: number
  lessons: number
  mine: Enrollment | undefined
}

/** Catalog rows with their derived stats; every listing uses this so numbers agree. */
export function useCatalog(courses?: Course[]): CatalogEntry[] {
  const { data } = useStore()
  const look = useLookup()
  return useMemo(
    () =>
      (courses ?? data.courses.filter((c) => c.status === 'published')).map((course) => {
        const r = ratingOf(data, course.id)
        return {
          course,
          instructor: look.user(course.instructorId),
          rating: r.rating,
          reviews: r.count,
          learners: data.enrollments.filter((e) => e.courseId === course.id && counts(e.status)).length,
          lessons: lessonCount(course),
          mine: data.enrollments.filter((e) => e.userId === data.currentUserId && e.courseId === course.id).sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))[0],
        }
      }),
    [courses, data, look],
  )
}

export const price = (p: number) => (p === 0 ? 'Free' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p))

export function CourseCard({ entry, to, compact: compactProp }: { entry: CatalogEntry; to: string; compact?: boolean }) {
  const { theme } = useStore()
  const look = useLookup()
  const { course, instructor, mine } = entry
  const compact = compactProp ?? theme.courseCard === 'compact'
  const cat = look.category(course.categoryId)
  const enrolledBadge = mine && (mine.status === 'active' || mine.status === 'completed')
  return (
    <article className="panel group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative">
        <CourseArt course={course} className={compact ? 'aspect-[21/9]' : undefined} />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm', course.price === 0 ? 'bg-success text-white' : 'bg-surface text-ink')}>{price(course.price)}</span>
          {enrolledBadge && <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">{mine.status === 'completed' ? 'Completed' : 'Enrolled'}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-muted">{cat?.name}</p>
        <h3 className="mt-1 font-display text-[1.05rem] leading-snug font-semibold text-ink">
          <Link to={to} className="after:absolute after:inset-0 focus-visible:outline-none">{course.title}</Link>
        </h3>
        {!compact && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{course.shortDescription}</p>}
        <div className="mt-3 flex items-center gap-2 text-sm">
          {instructor && <Avatar user={instructor} size="xs" />}
          <span className="truncate text-muted">{instructor?.name}</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-xs text-muted">
          <Stars value={entry.rating} count={entry.reviews} />
          <LevelTag level={course.level} />
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{course.estimatedHours} h</span>
          <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" />{entry.lessons} lessons</span>
        </div>
        {mine?.status === 'active' && <Progress className="mt-3" value={progressOf(course, mine)} label={`${course.title} progress`} />}
      </div>
    </article>
  )
}

/** Card for a course the student is taking: progress first. */
export function LearningCard({ course, enrollment }: { course: Course; enrollment: Enrollment }) {
  const look = useLookup()
  const pct = progressOf(course, enrollment)
  const next = nextLesson(course, enrollment)
  const last = course.sections.flatMap((s) => s.lessons).find((l) => l.id === enrollment.lastLessonId)
  return (
    <article className="panel flex flex-col overflow-hidden sm:flex-row">
      <CourseArt course={course} className="aspect-[3/1] sm:aspect-auto sm:w-44 sm:shrink-0" showIcon={false} />
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base leading-snug font-semibold">{course.title}</h3>
            <p className="mt-0.5 text-xs text-muted">{look.user(course.instructorId)?.name}</p>
          </div>
          {course.status !== 'published' && <Badge title="Removed from the catalog; you keep access">Not listed</Badge>}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={pct} label={`${course.title} progress`} />
          <span className="text-sm font-semibold tabular">{pct}%</span>
        </div>
        <p className="mt-2 truncate text-xs text-muted">{last ? <>Last opened: <span className="text-ink">{last.title}</span></> : 'Not started yet'}</p>
        <div className="mt-3">
          <Link to={`/learn/course/${course.id}/${next?.id ?? 'overview'}`} className="inline-flex h-8 items-center rounded-[var(--r-btn)] bg-primary px-3 text-[13px] font-medium text-primary-ink hover:bg-primary-strong">
            {pct === 0 ? 'Start course' : 'Continue learning'}
          </Link>
        </div>
      </div>
    </article>
  )
}
