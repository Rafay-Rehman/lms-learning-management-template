import {
  Award, BarChart3, Bell, BookCopy, BookMarked, BookOpen, Building2, CalendarDays, CalendarRange, ClipboardCheck, ClipboardList, Compass, Database, FileQuestion, FolderTree, GraduationCap,
  History, Landmark, LayoutDashboard, Layers, Library, ListTree, Megaphone, MenuSquare, MessageSquareText, Palette, PanelsTopLeft, PenSquare, Settings, ShieldCheck, Shapes, Star, Tags, TrendingUp,
  UserCog, UserRound, Users, UsersRound, Activity, FileDown, type LucideIcon,
} from 'lucide-react'
import type { PlatformSettings, Role } from '@/types'

// Sidebar structure for each role. The sidebar, mobile drawer, breadcrumbs
// and global search all read from here. Items marked `optional` can be hidden
// by an administrator (Navigation & Menu Settings); items with `feature` are
// hidden when that academic level is turned off in Platform Settings.

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  badge?: 'notifications' | 'tasks' | 'grading' | 'review'
  optional?: boolean
  feature?: keyof PlatformSettings['academic']
}
export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navigation: Record<Role, NavGroup[]> = {
  student: [
    {
      label: 'Learning',
      items: [
        { label: 'My Learning', to: '/learn', icon: LayoutDashboard },
        { label: 'Explore Courses', to: '/learn/explore', icon: Compass },
        { label: 'Learning Calendar', to: '/learn/calendar', icon: CalendarDays, optional: true },
        { label: 'Quizzes & Assessments', to: '/learn/assessments', icon: ClipboardCheck, badge: 'tasks' },
        { label: 'Certificates', to: '/learn/certificates', icon: Award },
        { label: 'Learning History', to: '/learn/history', icon: History, optional: true },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Notifications', to: '/learn/notifications', icon: Bell, badge: 'notifications' },
        { label: 'My Profile', to: '/learn/profile', icon: UserRound },
        { label: 'Settings', to: '/learn/settings', icon: Settings },
      ],
    },
  ],
  instructor: [
    {
      label: 'Teaching',
      items: [
        { label: 'Instructor Overview', to: '/teach', icon: LayoutDashboard },
        { label: 'My Courses', to: '/teach/courses', icon: BookCopy },
        { label: 'Course Builder', to: '/teach/builder', icon: PenSquare },
        { label: 'Lessons & Content', to: '/teach/lessons', icon: ListTree },
        { label: 'Student Management', to: '/teach/students', icon: UsersRound },
      ],
    },
    {
      label: 'Assessment',
      items: [
        { label: 'Quiz Builder', to: '/teach/quizzes', icon: FileQuestion },
        { label: 'Assignments', to: '/teach/assignments', icon: ClipboardList },
        { label: 'Grading', to: '/teach/grades', icon: ClipboardCheck, badge: 'grading' },
        { label: 'Learning Analytics', to: '/teach/analytics', icon: BarChart3, optional: true },
        { label: 'Announcements', to: '/teach/announcements', icon: Megaphone },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Notifications', to: '/teach/notifications', icon: Bell, badge: 'notifications' },
        { label: 'Instructor Profile', to: '/teach/profile', icon: UserRound },
        { label: 'Settings', to: '/teach/settings', icon: Settings },
      ],
    },
  ],
  admin: [
    {
      label: 'Overview',
      items: [
        { label: 'Admin Dashboard', to: '/admin', icon: LayoutDashboard },
        { label: 'Platform Analytics', to: '/admin/analytics', icon: TrendingUp },
        { label: 'Recent Activity', to: '/admin/activity', icon: Activity },
      ],
    },
    {
      label: 'Academic Management',
      items: [
        { label: 'Academic Years', to: '/admin/academic-years', icon: CalendarRange, feature: 'years' },
        { label: 'Terms / Semesters', to: '/admin/terms', icon: CalendarDays, feature: 'terms' },
        { label: 'Faculties', to: '/admin/faculties', icon: Landmark, feature: 'faculties' },
        { label: 'Departments', to: '/admin/departments', icon: Building2, feature: 'departments' },
        { label: 'Subjects', to: '/admin/subjects', icon: Library, feature: 'subjects' },
        { label: 'Subject Categories', to: '/admin/subject-categories', icon: FolderTree, feature: 'subjects' },
        { label: 'Courses', to: '/admin/courses', icon: BookOpen, badge: 'review' },
        { label: 'Course Categories', to: '/admin/categories', icon: Tags },
        { label: 'Sections / Modules', to: '/admin/modules', icon: Layers },
        { label: 'Lessons', to: '/admin/lessons', icon: ListTree },
        { label: 'Learning Resources', to: '/admin/resources', icon: BookMarked },
        { label: 'Learning Groups', to: '/admin/groups', icon: Shapes },
      ],
    },
    {
      label: 'People Management',
      items: [
        { label: 'Students', to: '/admin/students', icon: GraduationCap },
        { label: 'Instructors', to: '/admin/instructors', icon: Users },
        { label: 'Administrators', to: '/admin/administrators', icon: UserCog },
        { label: 'Roles & Permissions', to: '/admin/roles', icon: ShieldCheck },
        { label: 'Student Batches', to: '/admin/batches', icon: UsersRound },
        { label: 'Enrollments', to: '/admin/enrollments', icon: ClipboardList },
      ],
    },
    {
      label: 'Learning & Assessments',
      items: [
        { label: 'Quiz Management', to: '/admin/quizzes', icon: FileQuestion },
        { label: 'Question Bank', to: '/admin/question-bank', icon: Database },
        { label: 'Assignments', to: '/admin/assignments', icon: ClipboardList },
        { label: 'Exams / Assessments', to: '/admin/exams', icon: ClipboardCheck },
        { label: 'Grades & Results', to: '/admin/grades', icon: BarChart3, badge: 'grading' },
        { label: 'Certificates', to: '/admin/certificates', icon: Award },
        { label: 'Announcements', to: '/admin/announcements', icon: Megaphone },
      ],
    },
    {
      label: 'Platform Management',
      items: [
        { label: 'Course Reviews', to: '/admin/reviews', icon: Star },
        { label: 'Notifications', to: '/admin/notifications', icon: Bell, badge: 'notifications' },
        { label: 'Reports & Exports', to: '/admin/reports', icon: FileDown },
        { label: 'Platform Settings', to: '/admin/settings', icon: Settings },
        { label: 'Theme & Branding', to: '/admin/theme', icon: Palette },
        { label: 'Website Appearance', to: '/admin/website', icon: PanelsTopLeft },
        { label: 'Navigation & Menus', to: '/admin/navigation', icon: MenuSquare },
        { label: 'Demo Data', to: '/admin/demo-data', icon: MessageSquareText },
      ],
    },
  ],
}

export const allNavItems = (role: Role) => navigation[role].flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })))

/** The nav entry that owns a pathname (longest matching prefix). */
export function navItemFor(role: Role, pathname: string) {
  return allNavItems(role)
    .filter((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
    .sort((a, b) => b.to.length - a.to.length)[0]
}

export const visibleItems = (items: NavItem[], hidden: string[], academic: PlatformSettings['academic']) => items.filter((i) => !(i.optional && hidden.includes(i.to)) && !(i.feature && !academic[i.feature]))
