import type { Course, Role, User } from '@/types'

// Role permissions for the demo. The UI and the store's actions both check
// these, but everything runs in the browser: a real deployment must enforce
// the same rules on the server for every request.

export const PERMISSIONS = [
  { key: 'learn', label: 'Enroll in courses, study lessons, take quizzes', roles: ['student'] },
  { key: 'course.create', label: 'Create courses and edit their own courses', roles: ['instructor', 'admin'] },
  { key: 'course.publish', label: 'Publish courses without review', roles: ['admin'] },
  { key: 'course.any', label: 'Edit, archive and delete any course', roles: ['admin'] },
  { key: 'assess.manage', label: 'Build quizzes, assignments and question bank items', roles: ['instructor', 'admin'] },
  { key: 'assess.grade', label: 'Grade submissions and written answers', roles: ['instructor', 'admin'] },
  { key: 'enroll.manage', label: 'Enroll, suspend and remove students', roles: ['instructor', 'admin'] },
  { key: 'announce', label: 'Post course announcements', roles: ['instructor', 'admin'] },
  { key: 'academic.manage', label: 'Manage academic years, terms, departments and subjects', roles: ['admin'] },
  { key: 'users.manage', label: 'Create users, change roles, activate and deactivate accounts', roles: ['admin'] },
  { key: 'certificates.manage', label: 'Issue, revoke and reinstate certificates', roles: ['admin'] },
  { key: 'platform.manage', label: 'Change platform settings, theme and website', roles: ['admin'] },
] as const satisfies readonly { key: string; label: string; roles: Role[] }[]

export type Permission = (typeof PERMISSIONS)[number]['key']

export const can = (user: Pick<User, 'role' | 'active'> | undefined, p: Permission) => !!user?.active && (PERMISSIONS.find((x) => x.key === p)!.roles as readonly Role[]).includes(user.role)

/** Instructors manage their own courses; administrators manage all. */
export const canEditCourse = (user: User | undefined, course: Pick<Course, 'instructorId'>) => !!user && (can(user, 'course.any') || (can(user, 'course.create') && course.instructorId === user.id))

export const roleLabel: Record<Role, string> = { student: 'Student', instructor: 'Instructor', admin: 'Administrator' }
export const roleHome: Record<Role, string> = { student: '/learn', instructor: '/teach', admin: '/admin' }
