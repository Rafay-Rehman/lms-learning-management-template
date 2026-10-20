import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { Compass } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DemoSwitcherProvider } from '@/components/layout/DemoSwitcher'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ToastProvider } from '@/components/ui/Toast'
import { EmptyState } from '@/components/ui/misc'
import { StoreProvider } from '@/state/store'

// Pages are code-split so the first load only ships the shell and the current page.
const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load)

const P = {
  Landing: page(() => import('@/features/public/LandingPage')),
  Catalog: page(() => import('@/features/public/CatalogPage')),
  CourseDetail: page(() => import('@/features/public/CourseDetailPage')),
  Verify: page(() => import('@/features/certificates/VerifyPage')),
  Player: page(() => import('@/features/learning/PlayerPage')),

  StudentHome: page(() => import('@/features/student/StudentDashboard')),
  Calendar: page(() => import('@/features/student/CalendarPage')),
  Assessments: page(() => import('@/features/student/AssessmentsPage')),
  Quiz: page(() => import('@/features/assessments/QuizPage')),
  Attempt: page(() => import('@/features/assessments/AttemptPage')),
  StudentAssignment: page(() => import('@/features/assessments/StudentAssignmentPage')),
  MyCertificates: page(() => import('@/features/certificates/MyCertificatesPage')),
  Certificate: page(() => import('@/features/certificates/CertificatePage')),
  History: page(() => import('@/features/student/HistoryPage')),
  Notifications: page(() => import('@/features/notifications/NotificationsPage')),
  Profile: page(() => import('@/features/settings/ProfilePage')),
  UserSettings: page(() => import('@/features/settings/UserSettingsPage')),

  TeachHome: page(() => import('@/features/instructor/InstructorDashboard')),
  Courses: page(() => import('@/features/courses/CoursesPage')),
  Builder: page(() => import('@/features/courses/CourseBuilderPage')),
  Lessons: page(() => import('@/features/courses/LessonsPage')),
  Modules: page(() => import('@/features/courses/ModulesPage')),
  Resources: page(() => import('@/features/courses/ResourcesPage')),
  Enrollments: page(() => import('@/features/courses/EnrollmentsPage')),
  Quizzes: page(() => import('@/features/assessments/QuizzesPage')),
  QuizBuilder: page(() => import('@/features/assessments/QuizBuilderPage')),
  Assignments: page(() => import('@/features/assessments/AssignmentsPage')),
  AssignmentReview: page(() => import('@/features/assessments/AssignmentReviewPage')),
  Grades: page(() => import('@/features/assessments/GradesPage')),
  Bank: page(() => import('@/features/assessments/QuestionBankPage')),
  TeachAnalytics: page(() => import('@/features/instructor/AnalyticsPage')),
  Announcements: page(() => import('@/features/courses/AnnouncementsPage')),

  AdminHome: page(() => import('@/features/admin/AdminDashboard')),
  PlatformAnalytics: page(() => import('@/features/admin/PlatformAnalyticsPage')),
  Activity: page(() => import('@/features/admin/ActivityPage')),
  Years: page(() => import('@/features/admin/academic/YearsPage')),
  Terms: page(() => import('@/features/admin/academic/TermsPage')),
  Faculties: page(() => import('@/features/admin/academic/FacultiesPage')),
  Departments: page(() => import('@/features/admin/academic/DepartmentsPage')),
  SubjectCategories: page(() => import('@/features/admin/academic/SubjectCategoriesPage')),
  Categories: page(() => import('@/features/admin/academic/CategoriesPage')),
  Subjects: page(() => import('@/features/admin/SubjectsPage')),
  Subject: page(() => import('@/features/admin/SubjectDetailPage')),
  Groups: page(() => import('@/features/admin/GroupsPage')),
  Batches: page(() => import('@/features/admin/BatchesPage')),
  Students: page(() => import('@/features/admin/users/StudentsPage')),
  Instructors: page(() => import('@/features/admin/users/InstructorsPage')),
  Admins: page(() => import('@/features/admin/users/AdministratorsPage')),
  User: page(() => import('@/features/admin/users/UserDetailPage')),
  Roles: page(() => import('@/features/admin/RolesPage')),
  Exams: page(() => import('@/features/assessments/ExamsPage')),
  AdminCertificates: page(() => import('@/features/certificates/AdminCertificatesPage')),
  Reviews: page(() => import('@/features/admin/ReviewsPage')),
  Reports: page(() => import('@/features/admin/ReportsPage')),
  PlatformSettings: page(() => import('@/features/admin/PlatformSettingsPage')),
  Theme: page(() => import('@/features/admin/theme/ThemePage')),
  Website: page(() => import('@/features/admin/WebsitePage')),
  NavSettings: page(() => import('@/features/admin/NavigationPage')),
  DemoData: page(() => import('@/features/admin/DemoDataPage')),
}

const student: [string, ComponentType][] = [
  ['', P.StudentHome], ['explore', P.Catalog], ['explore/:slug', P.CourseDetail], ['calendar', P.Calendar], ['assessments', P.Assessments],
  ['quizzes/:quizId', P.Quiz], ['quizzes/:quizId/attempts/:attemptId', P.Attempt], ['assignments/:id', P.StudentAssignment],
  ['certificates', P.MyCertificates], ['certificates/:id', P.Certificate], ['history', P.History], ['notifications', P.Notifications], ['profile', P.Profile], ['settings', P.UserSettings],
]
// Shared between instructors (own courses) and administrators (all courses).
const teaching: [string, ComponentType][] = [
  ['courses', P.Courses], ['builder', P.Builder], ['lessons', P.Lessons], ['quizzes', P.Quizzes], ['quizzes/:id', P.QuizBuilder],
  ['assignments', P.Assignments], ['assignments/:id', P.AssignmentReview], ['grades', P.Grades], ['announcements', P.Announcements], ['notifications', P.Notifications],
]
const instructor: [string, ComponentType][] = [['', P.TeachHome], ...teaching, ['students', P.Enrollments], ['analytics', P.TeachAnalytics], ['profile', P.Profile], ['settings', P.UserSettings]]
const admin: [string, ComponentType][] = [
  ['', P.AdminHome], ...teaching, ['analytics', P.PlatformAnalytics], ['activity', P.Activity],
  ['academic-years', P.Years], ['terms', P.Terms], ['faculties', P.Faculties], ['departments', P.Departments], ['subject-categories', P.SubjectCategories], ['categories', P.Categories],
  ['subjects', P.Subjects], ['subjects/:id', P.Subject], ['modules', P.Modules], ['resources', P.Resources], ['groups', P.Groups], ['batches', P.Batches],
  ['students', P.Students], ['instructors', P.Instructors], ['administrators', P.Admins], ['users/:id', P.User], ['roles', P.Roles], ['enrollments', P.Enrollments],
  ['question-bank', P.Bank], ['exams', P.Exams], ['exams/:id', P.QuizBuilder], ['certificates', P.AdminCertificates], ['reviews', P.Reviews], ['reports', P.Reports],
  ['settings', P.PlatformSettings], ['theme', P.Theme], ['website', P.Website], ['navigation', P.NavSettings], ['demo-data', P.DemoData],
]

export function NotFound() {
  return (
    <EmptyState
      icon={<Compass />}
      title="This page doesn’t exist"
      body="The link may be out of date, or the record was deleted."
      action={<Link to="/" className="inline-flex h-9 items-center rounded-[var(--r-btn)] bg-primary px-3.5 text-sm font-medium text-primary-ink hover:bg-primary-strong">Go to the home page</Link>}
      className="py-24"
      heading
    />
  )
}

function Fallback() {
  return <div className="m-6 h-40 animate-pulse rounded-[var(--radius)] bg-surface-3/60" role="status" aria-label="Loading" />
}

const wrap = (C: ComponentType) => (
  <Suspense fallback={<Fallback />}>
    <C />
  </Suspense>
)

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <ToastProvider>
          <DemoSwitcherProvider>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={wrap(P.Landing)} />
                <Route path="courses" element={wrap(P.Catalog)} />
                <Route path="courses/:slug" element={wrap(P.CourseDetail)} />
                <Route path="verify" element={wrap(P.Verify)} />
                <Route path="verify/:code" element={wrap(P.Verify)} />
              </Route>
              <Route path="learn/course/:courseId/:lessonId" element={wrap(P.Player)} />
              {([['learn', 'student', student], ['teach', 'instructor', instructor], ['admin', 'admin', admin]] as const).map(([base, role, routes]) => (
                <Route key={base} path={base} element={<AppShell role={role} />}>
                  {routes.map(([path, C]) => (path ? <Route key={path} path={path} element={wrap(C)} /> : <Route key="index" index element={wrap(C)} />))}
                  <Route path="*" element={<NotFound />} />
                </Route>
              ))}
              <Route element={<PublicLayout />}>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </DemoSwitcherProvider>
        </ToastProvider>
      </StoreProvider>
    </BrowserRouter>
  )
}
