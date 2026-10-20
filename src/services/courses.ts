import type { AppData, Course, CourseStatus, Lesson, PlatformSettings } from '@/types'
import { allLessons } from './learning'

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'course'

export const courseStatusMeta: Record<CourseStatus, { label: string; color: string; hint: string }> = {
  draft: { label: 'Draft', color: 'var(--faint)', hint: 'Only visible to its instructor and administrators' },
  review: { label: 'In review', color: 'var(--warning)', hint: 'Waiting for an administrator to publish' },
  published: { label: 'Published', color: 'var(--success)', hint: 'Listed in the catalog and open for enrollment' },
  archived: { label: 'Archived', color: 'var(--muted)', hint: 'Hidden from the catalog; enrolled students keep access' },
}

/** Links and media must be http(s) or files bundled with the app — never javascript: or data: URLs. */
export function isSafeUrl(url: string) {
  if (url.startsWith('/') && !url.startsWith('//')) return true
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Resolves a video URL into something we can render, or null for the placeholder. */
export function videoSource(url: string): { kind: 'file' | 'embed'; src: string } | null {
  if (!url || !isSafeUrl(url)) return null
  try {
    const u = new URL(url, location.origin)
    if (/(^|\.)youtube\.com$/.test(u.hostname) && u.searchParams.get('v')) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.searchParams.get('v')!)}` }
    if (u.hostname === 'youtu.be') return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}` }
    if (/(^|\.)vimeo\.com$/.test(u.hostname) && /^\/\d+/.test(u.pathname)) return { kind: 'embed', src: `https://player.vimeo.com/video${u.pathname}` }
    if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { kind: 'file', src: u.href }
  } catch {
    /* fall through */
  }
  return null
}

export function lessonProblem(l: Lesson, data: Pick<AppData, 'quizzes'>, courseId: string): string | null {
  if (!l.title.trim()) return 'needs a title'
  if (!(l.durationMinutes > 0 && l.durationMinutes <= 600)) return 'needs a duration between 1 and 600 minutes'
  if ((l.type === 'pdf' || l.type === 'link') && !l.url.trim()) return 'needs a URL'
  if (l.url && !isSafeUrl(l.url)) return 'has a URL that isn’t http(s)'
  if (l.videoUrl && !isSafeUrl(l.videoUrl)) return 'has a video URL that isn’t http(s)'
  if (l.type === 'quiz') {
    const q = data.quizzes.find((x) => x.id === l.quizId)
    if (!q || q.courseId !== courseId) return 'needs a quiz from this course'
  }
  for (const r of l.resources) if (!r.title.trim() || !isSafeUrl(r.url)) return 'has a resource without a title or a valid URL'
  return null
}

/** Basic information every saved course needs. */
export function validateCourse(c: Course, data: Pick<AppData, 'categories' | 'users' | 'courses' | 'quizzes' | 'subjects'>): Record<string, string> {
  const e: Record<string, string> = {}
  if (c.title.trim().length < 4) e.title = 'Enter a title of at least 4 characters'
  if (c.title.length > 120) e.title = 'Keep the title under 120 characters'
  if (!c.shortDescription.trim()) e.shortDescription = 'Add a one-line summary for the catalog'
  else if (c.shortDescription.length > 200) e.shortDescription = 'Keep the summary under 200 characters'
  if (!data.categories.some((x) => x.id === c.categoryId)) e.categoryId = 'Choose a category'
  const inst = data.users.find((u) => u.id === c.instructorId)
  if (!inst || inst.role !== 'instructor') e.instructorId = 'Choose an instructor'
  if (c.subjectId && !data.subjects.some((s) => s.id === c.subjectId)) e.subjectId = 'That subject no longer exists'
  if (!(c.estimatedHours > 0 && c.estimatedHours <= 500)) e.estimatedHours = 'Estimated duration must be between 1 and 500 hours'
  if (!(c.price >= 0 && c.price <= 10000)) e.price = 'Price must be between 0 and 10,000'
  if (data.courses.some((x) => x.id !== c.id && x.slug === c.slug)) e.title = 'Another course already uses this title'
  c.sections.forEach((s, si) => {
    if (!s.title.trim() && !e.curriculum) e.curriculum = `Section ${si + 1} needs a title`
    for (const l of s.lessons) {
      const p = lessonProblem(l, data, c.id)
      if (p && !e.curriculum) e.curriculum = `“${l.title || 'Untitled lesson'}” ${p}`
    }
  })
  return e
}

/** Extra requirements before a course can be published or sent for review. */
export function publishProblems(c: Course, settings: PlatformSettings): string[] {
  const out: string[] = []
  if (c.description.trim().length < 80) out.push('Write a full description (at least 80 characters)')
  if (!c.objectives.filter((o) => o.trim()).length) out.push('Add at least one learning objective')
  const lessons = allLessons(c)
  if (lessons.length < settings.publication.minLessons) out.push(`Add at least ${settings.publication.minLessons} lessons (platform rule)`)
  if (!lessons.some((l) => l.required)) out.push('Mark at least one lesson as required')
  if (c.sections.some((s) => !s.lessons.length)) out.push('Remove or fill empty sections')
  return out
}

/** Courses that visitors can see and enroll in. */
export const isPublic = (c: Course) => c.status === 'published'
