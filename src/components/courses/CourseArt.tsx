import type { Course } from '@/types'
import { cn } from '@/lib/cn'
import { iconFor } from '@/components/ui/icons'
import { useLookup } from '@/state/selectors'

// Generated course covers: a category-tinted field with one of four line
// patterns chosen by the course's seed. No stock photography to license; an
// uploaded thumbnail replaces it.

const patterns = [
  // ruled notebook lines
  (h: number) => Array.from({ length: 9 }, (_, i) => <line key={i} x1="0" x2="320" y1={20 + i * 20} y2={20 + i * 20} stroke={`hsl(${h} 60% 92% / .22)`} strokeWidth="1" />),
  // concentric arcs
  (h: number) => Array.from({ length: 7 }, (_, i) => <circle key={i} cx="290" cy="190" r={30 + i * 26} fill="none" stroke={`hsl(${h} 70% 90% / .2)`} strokeWidth="1.5" />),
  // dot grid
  (h: number) => Array.from({ length: 12 * 7 }, (_, i) => <circle key={i} cx={14 + (i % 12) * 27} cy={14 + Math.floor(i / 12) * 27} r="1.6" fill={`hsl(${h} 70% 92% / .3)`} />),
  // diagonal bands
  (h: number) => Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${-60 + i * 44} 180 L${40 + i * 44} 0`} stroke={`hsl(${h} 60% 92% / .16)`} strokeWidth="14" />),
]

export function CourseArt({ course, className, showIcon = true }: { course: Pick<Course, 'thumbnail' | 'artSeed' | 'categoryId' | 'title'>; className?: string; showIcon?: boolean }) {
  const look = useLookup()
  const cat = look.category(course.categoryId)
  if (course.thumbnail) return <img src={course.thumbnail} alt="" className={cn('aspect-[16/9] w-full object-cover', className)} />
  const hue = ((cat?.hue ?? 230) + (course.artSeed % 3) * 8) % 360
  const Icon = iconFor(cat?.icon ?? 'book')
  return (
    <div className={cn('relative aspect-[16/9] w-full overflow-hidden', className)} style={{ background: `linear-gradient(135deg, hsl(${hue} 52% 34%), hsl(${(hue + 28) % 360} 48% 22%))` }} aria-hidden>
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        {patterns[course.artSeed % patterns.length](hue)}
      </svg>
      {showIcon && <Icon className="absolute right-[7%] bottom-[10%] size-[26%] text-white/80" strokeWidth={1.25} />}
    </div>
  )
}
