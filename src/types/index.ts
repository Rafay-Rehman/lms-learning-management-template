// Domain model. Every page reads these shapes from the central store
// (src/state/store.tsx); business rules live in src/services.

export type ID = string
/** Local calendar date, `YYYY-MM-DD`. */
export type DateString = string
/** Full ISO timestamp. */
export type ISO = string

// ——— People ———

export type Role = 'student' | 'instructor' | 'admin'

export interface NotificationPrefs {
  enrollment: boolean
  completion: boolean
  deadline: boolean
  quiz: boolean
  announcement: boolean
  feedback: boolean
  certificate: boolean
  system: boolean
}

export interface User {
  id: ID
  name: string
  email: string
  role: Role
  active: boolean
  title: string
  bio: string
  color: string
  /** data: URL chosen in the profile page (browser-local only). */
  avatar: string | null
  interests: string[]
  expertise: string[]
  links: { label: string; url: string }[]
  timezone: string
  /** Weekly study goal in minutes (students). */
  weeklyGoalMinutes: number
  departmentId: ID | null
  notificationPrefs: NotificationPrefs
  createdAt: ISO
  lastActiveAt: ISO | null
}

// ——— Academic structure ———

export type PeriodStatus = 'active' | 'upcoming' | 'archived'

export interface AcademicYear {
  id: ID
  name: string
  start: DateString
  end: DateString
  status: PeriodStatus
}

export interface Term {
  id: ID
  yearId: ID
  name: string
  start: DateString
  end: DateString
  status: PeriodStatus
}

export interface Faculty {
  id: ID
  name: string
  description: string
  deanId: ID | null
}

export interface Department {
  id: ID
  name: string
  code: string
  facultyId: ID | null
  description: string
  headId: ID | null
}

export interface SubjectCategory {
  id: ID
  name: string
  description: string
}

export type SubjectStatus = 'draft' | 'active' | 'archived'
export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface Subject {
  id: ID
  name: string
  code: string
  shortDescription: string
  description: string
  categoryId: ID | null
  departmentId: ID | null
  instructorIds: ID[]
  yearId: ID | null
  termId: ID | null
  level: Level
  /** Key into the subject icon set (src/components/ui/icons.ts). */
  icon: string
  status: SubjectStatus
  createdAt: ISO
  updatedAt: ISO
}

/** Catalog category for courses (what visitors browse by). */
export interface Category {
  id: ID
  name: string
  description: string
  /** Hue (0–360) used for generated course art. */
  hue: number
  icon: string
}

export interface StudentGroup {
  id: ID
  name: string
  kind: 'classroom' | 'batch'
  description: string
  yearId: ID | null
  studentIds: ID[]
  courseIds: ID[]
  createdAt: ISO
}

// ——— Courses ———

export type CourseStatus = 'draft' | 'review' | 'published' | 'archived'
export type LessonType = 'video' | 'text' | 'pdf' | 'link' | 'quiz'

export interface Resource {
  id: ID
  title: string
  kind: 'file' | 'link'
  url: string
  /** Human-readable size for files, e.g. "84 KB". */
  size?: string
}

export interface Lesson {
  id: ID
  title: string
  type: LessonType
  durationMinutes: number
  required: boolean
  /** Visible to visitors on the course page before enrolling. */
  preview: boolean
  summary: string
  /** Text lessons: paragraphs separated by blank lines; "## " starts a heading, "- " a bullet. */
  body: string
  /** Video lessons: an https MP4/WebM URL or a YouTube/Vimeo link. Empty shows a labeled placeholder. */
  videoUrl: string
  /** PDF and link lessons. */
  url: string
  quizId: ID | null
  resources: Resource[]
}

export interface Section {
  id: ID
  title: string
  lessons: Lesson[]
}

export interface Course {
  id: ID
  slug: string
  title: string
  shortDescription: string
  description: string
  categoryId: ID
  subjectId: ID | null
  instructorId: ID
  termId: ID | null
  level: Level
  /** Instructor's estimate, in hours, shown in the catalog. */
  estimatedHours: number
  objectives: string[]
  prerequisites: string[]
  tags: string[]
  /** 0 = free. Demo only — no payment is taken. */
  price: number
  status: CourseStatus
  publishedAt: ISO | null
  /** Scheduled publication date (optional). */
  publishOn: DateString | null
  awardsCertificate: boolean
  /** data: URL; without one, generated art from the category hue is shown. */
  thumbnail: string | null
  /** Seed for the generated cover pattern. */
  artSeed: number
  sections: Section[]
  createdAt: ISO
  updatedAt: ISO
}

// ——— Enrollment & progress ———

export type EnrollmentStatus = 'active' | 'completed' | 'suspended' | 'cancelled'

export interface Enrollment {
  id: ID
  userId: ID
  courseId: ID
  status: EnrollmentStatus
  enrolledAt: ISO
  completedAt: ISO | null
  lastActivityAt: ISO | null
  lastLessonId: ID | null
  /** lessonId → completion timestamp. */
  progress: Record<ID, ISO>
  bookmarks: ID[]
  /** lessonId → personal notes. */
  notes: Record<ID, string>
  groupId: ID | null
}

/** One study session or completion event — feeds the activity charts. */
export interface LearningEvent {
  id: ID
  userId: ID
  courseId: ID
  lessonId: ID | null
  kind: 'study' | 'lesson' | 'quiz' | 'assignment'
  minutes: number
  at: ISO
}

// ——— Assessments ———

export type QuestionType = 'single' | 'multiple' | 'true_false' | 'short'

export interface Question {
  id: ID
  type: QuestionType
  text: string
  options: { id: ID; text: string }[]
  /** Option ids; for short answers, accepted answer strings (empty = graded by hand). */
  correct: string[]
  explanation: string
  points: number
  /** Question-bank record this was copied from. */
  sourceId: ID | null
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface BankQuestion extends Question {
  subjectId: ID | null
  courseId: ID | null
  topic: string
  tags: string[]
  difficulty: Difficulty
  status: 'active' | 'draft' | 'retired'
  createdAt: ISO
  updatedAt: ISO
}

export type ReviewPolicy = 'after_submit' | 'after_pass' | 'never'

export interface Quiz {
  id: ID
  courseId: ID
  kind: 'quiz' | 'exam'
  title: string
  description: string
  instructions: string
  questions: Question[]
  /** Percentage needed to pass. */
  passingScore: number
  timeLimitMinutes: number | null
  /** null = unlimited. */
  maxAttempts: number | null
  availableFrom: DateString | null
  /** Due date; also closes the quiz. */
  availableUntil: DateString | null
  review: ReviewPolicy
  status: 'draft' | 'published'
  createdAt: ISO
  updatedAt: ISO
}

export interface QuizAttempt {
  id: ID
  quizId: ID
  userId: ID
  startedAt: ISO
  submittedAt: ISO | null
  /** questionId → selected option ids, or [text] for short answers. */
  answers: Record<ID, string[]>
  /** Points awarded by hand for questions that need it. */
  manualPoints: Record<ID, number>
  status: 'in_progress' | 'pending_review' | 'graded'
  score: number
  maxScore: number
  gradedById: ID | null
}

export type AssignmentStatus = 'draft' | 'assigned' | 'closed'

export interface Assignment {
  id: ID
  courseId: ID
  title: string
  instructions: string
  dueDate: DateString
  maxPoints: number
  allowLate: boolean
  status: AssignmentStatus
  createdAt: ISO
}

export type SubmissionStatus = 'submitted' | 'late' | 'graded' | 'returned'

export interface Submission {
  id: ID
  assignmentId: ID
  userId: ID
  text: string
  /** File names and sizes only — the files never leave the browser. */
  attachments: { name: string; size: number; type: string }[]
  submittedAt: ISO
  status: SubmissionStatus
  grade: number | null
  feedback: string
  gradedAt: ISO | null
}

// ——— Certificates, communication ———

export interface Certificate {
  id: ID
  /** Public code shown on the certificate, e.g. LCT-7K4Q-2M9X. */
  code: string
  enrollmentId: ID
  userId: ID
  courseId: ID
  issuedAt: ISO
  status: 'valid' | 'revoked'
  revokedReason: string
  /** Snapshots so the certificate reads the same even if records are renamed later. */
  studentName: string
  courseTitle: string
  instructorName: string
  issuer: string
}

export interface Announcement {
  id: ID
  courseId: ID
  authorId: ID
  title: string
  body: string
  pinned: boolean
  createdAt: ISO
}

/** Lesson Q&A. Replies point at their question with `parentId`. */
export interface Comment {
  id: ID
  courseId: ID
  lessonId: ID
  userId: ID
  parentId: ID | null
  body: string
  createdAt: ISO
}

export interface Review {
  id: ID
  courseId: ID
  userId: ID
  rating: number
  body: string
  status: 'published' | 'hidden'
  createdAt: ISO
}

export type NotificationKind = keyof NotificationPrefs

export interface Notification {
  id: ID
  userId: ID
  kind: NotificationKind
  title: string
  body: string
  link: string
  read: boolean
  createdAt: ISO
}

export interface AuditEntry {
  id: ID
  actorId: ID
  message: string
  link: string
  area: 'academic' | 'people' | 'course' | 'assessment' | 'certificate' | 'platform' | 'enrollment'
  at: ISO
}

// ——— Platform configuration ———

export interface PlatformSettings {
  name: string
  tagline: string
  description: string
  /** data: URL or null for the bundled mark. */
  logo: string | null
  favicon: string | null
  language: string
  timezone: string
  supportEmail: string
  certificate: {
    issuer: string
    signatoryName: string
    signatoryTitle: string
    showSeal: boolean
    footnote: string
  }
  learning: {
    /** Quiz lessons only count as complete once the quiz is passed. */
    quizMustPass: boolean
    defaultWeeklyGoal: number
    allowLateSubmissions: boolean
  }
  publication: {
    /** Instructors submit for review; administrators publish. */
    requireReview: boolean
    minLessons: number
  }
  /** Which academic levels this organization uses. Unused levels are hidden. */
  academic: {
    years: boolean
    terms: boolean
    faculties: boolean
    departments: boolean
    subjects: boolean
  }
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface Palette {
  primary: string
  secondary: string
  accent: string
  link: string
  success: string
  warning: string
  error: string
  background: string
  surface: string
  text: string
  muted: string
  border: string
  sidebar: string
  sidebarText: string
}

export interface Theme {
  presetId: string
  mode: ThemeMode
  light: Palette
  dark: Palette
  font: string
  headingFont: string
  /** 0.9 – 1.15 */
  fontScale: number
  density: 'comfortable' | 'compact'
  /** Card radius in px. */
  radius: number
  cardStyle: 'bordered' | 'elevated' | 'flat'
  shadow: 'none' | 'soft' | 'strong'
  buttonShape: 'rounded' | 'pill' | 'square'
  sidebarStyle: 'brand' | 'dark' | 'light'
  sidebarCollapsed: boolean
  headerStyle: 'glass' | 'solid'
  contentWidth: 'standard' | 'wide' | 'full'
  courseCard: 'detailed' | 'compact'
  reducedMotion: boolean
  widgets: Record<DashboardWidget, boolean>
}

export type DashboardWidget = 'activity' | 'tasks' | 'recommended' | 'achievements' | 'goal'

export type LandingSectionId = 'featured' | 'categories' | 'benefits' | 'instructors' | 'stats' | 'testimonials' | 'faq' | 'cta'

export interface WebsiteConfig {
  headline: string
  subheading: string
  ctaText: string
  heroVisual: 'syllabus' | 'pattern' | 'plain'
  sections: { id: LandingSectionId; visible: boolean }[]
  featuredCourseIds: ID[]
  visibleCategoryIds: ID[]
  testimonials: { id: ID; name: string; role: string; quote: string }[]
  faq: { id: ID; q: string; a: string }[]
  footerBlurb: string
  nav: { id: 'courses' | 'categories' | 'instructors' | 'faq' | 'verify'; label: string; visible: boolean }[]
  /** Student/instructor sidebar entries an admin has hidden. */
  hiddenNav: string[]
}

export interface AppData {
  version: number
  seededOn: DateString
  currentUserId: ID
  users: User[]
  academicYears: AcademicYear[]
  terms: Term[]
  faculties: Faculty[]
  departments: Department[]
  subjectCategories: SubjectCategory[]
  subjects: Subject[]
  categories: Category[]
  groups: StudentGroup[]
  courses: Course[]
  enrollments: Enrollment[]
  events: LearningEvent[]
  quizzes: Quiz[]
  attempts: QuizAttempt[]
  bank: BankQuestion[]
  assignments: Assignment[]
  submissions: Submission[]
  certificates: Certificate[]
  announcements: Announcement[]
  comments: Comment[]
  reviews: Review[]
  notifications: Notification[]
  audit: AuditEntry[]
  settings: PlatformSettings
  theme: Theme
  website: WebsiteConfig
}

/** Per-browser preferences (not part of the shared data). */
export interface Preferences {
  /** null = follow the platform default. */
  mode: ThemeMode | null
  sidebarCollapsed: boolean | null
  reducedMotion: boolean
  largeText: boolean
}
