import { useMemo } from 'react'
import type { AppData, Course, Enrollment, ID, Notification, User } from '@/types'
import { useStore } from './store'

// Read helpers shared by pages. Lookups are memoised per data snapshot.

export function lookup(data: AppData) {
  const by = <T extends { id: ID }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]))
  const users = by(data.users)
  const courses = by(data.courses)
  return {
    users,
    courses,
    user: (id: ID | null | undefined) => (id ? users.get(id) : undefined),
    course: (id: ID | null | undefined) => (id ? courses.get(id) : undefined),
    category: (id: ID | null | undefined) => data.categories.find((c) => c.id === id),
    subject: (id: ID | null | undefined) => data.subjects.find((s) => s.id === id),
    department: (id: ID | null | undefined) => data.departments.find((s) => s.id === id),
    term: (id: ID | null | undefined) => data.terms.find((s) => s.id === id),
    year: (id: ID | null | undefined) => data.academicYears.find((s) => s.id === id),
    quiz: (id: ID | null | undefined) => data.quizzes.find((q) => q.id === id),
    courseBySlug: (slug: string) => data.courses.find((c) => c.slug === slug),
  }
}

export function useLookup() {
  const { data } = useStore()
  return useMemo(() => lookup(data), [data])
}

export function useMe(): User {
  const { data } = useStore()
  return data.users.find((u) => u.id === data.currentUserId) ?? data.users[0]
}

/** The current student's enrollments with their courses, newest activity first. */
export function useMyEnrollments(): (Enrollment & { course: Course })[] {
  const { data } = useStore()
  return useMemo(
    () =>
      data.enrollments
        .filter((e) => e.userId === data.currentUserId)
        .map((e) => ({ ...e, course: data.courses.find((c) => c.id === e.courseId)! }))
        .filter((e) => e.course)
        .sort((a, b) => (b.lastActivityAt ?? b.enrolledAt).localeCompare(a.lastActivityAt ?? a.enrolledAt)),
    [data],
  )
}

/** Notifications for the current user, minus kinds they've turned off. */
export function useMyNotifications(): Notification[] {
  const { data } = useStore()
  const me = useMe()
  return useMemo(() => data.notifications.filter((n) => n.userId === me.id && me.notificationPrefs[n.kind] !== false), [data.notifications, me])
}

/** Courses the current instructor teaches (all courses for administrators). */
export function useTeachingCourses(): Course[] {
  const { data } = useStore()
  const me = useMe()
  return useMemo(() => (me.role === 'admin' ? data.courses : data.courses.filter((c) => c.instructorId === me.id)), [data.courses, me])
}

/** Base path for pages shared by instructors and administrators. */
export function useStaffBase() {
  return useMe().role === 'admin' ? '/admin' : '/teach'
}

/** Shows an action's first error as a toast; returns whether it succeeded. */
export function report(toast: (m: string, o?: { tone?: 'error' | 'success' | 'info' }) => void, r: { ok: boolean; errors?: Record<string, string> }, success?: string) {
  if (!r.ok) {
    toast(Object.values(r.errors ?? {})[0] ?? 'Something went wrong', { tone: 'error' })
    return false
  }
  if (success) toast(success)
  return true
}
