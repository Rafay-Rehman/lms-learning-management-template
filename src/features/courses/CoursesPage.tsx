import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Archive, ArchiveRestore, BookOpen, Copy, Download, Eye, EyeOff, PenSquare, Plus, Send, Trash2, Upload } from 'lucide-react'
import type { Course, CourseStatus } from '@/types'
import { CourseArt } from '@/components/courses/CourseArt'
import { Avatar, StatusBadge } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import type { MenuItem } from '@/components/ui/Menu'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/date'
import { courseStatusMeta } from '@/services/courses'
import { counts, lessonCount } from '@/services/learning'
import { can } from '@/services/permissions'
import { report, useLookup, useMe, useStaffBase, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

export function useCourseActions() {
  const { data, actions } = useStore()
  const me = useMe()
  const toast = useToast()
  const navigate = useNavigate()
  const base = useStaffBase()
  const [confirm, dialog] = useConfirm()
  const setStatus = (c: Course, to: CourseStatus) => {
    const r = actions.setCourseStatus(c.id, to)
    if (!report(toast, r)) return
    const got = (r as { id: CourseStatus }).id
    toast(got === 'review' ? `${c.title} sent for review` : got === 'published' ? `${c.title} published` : got === 'archived' ? `${c.title} archived` : `${c.title} moved to draft`)
  }
  const items = (c: Course): (MenuItem | 'divider')[] => {
    const enrolled = data.enrollments.filter((e) => e.courseId === c.id && counts(e.status)).length
    const publisher = can(me, 'course.publish') || !data.settings.publication.requireReview
    return [
      { label: 'Edit in builder', icon: <PenSquare />, onSelect: () => navigate(`${base}/builder?course=${c.id}`) },
      { label: 'View course page', icon: <Eye />, onSelect: () => navigate(`/courses/${c.slug}`) },
      { label: 'Duplicate', icon: <Copy />, onSelect: () => { const r = actions.duplicateCourse(c.id); if (report(toast, r, 'Copy created as a draft')) navigate(`${base}/builder?course=${(r as { id: string }).id}`) } },
      'divider',
      ...(c.status === 'draft' ? [{ label: publisher ? 'Publish' : 'Submit for review', icon: publisher ? <Upload /> : <Send />, onSelect: () => setStatus(c, 'published') }] : []),
      ...(c.status === 'review' && can(me, 'course.publish') ? [{ label: 'Approve and publish', icon: <Upload />, onSelect: () => setStatus(c, 'published') }] : []),
      ...(c.status === 'review' ? [{ label: 'Return to draft', icon: <EyeOff />, onSelect: () => setStatus(c, 'draft') }] : []),
      ...(c.status === 'published'
        ? [{ label: 'Unpublish', icon: <EyeOff />, onSelect: () => confirm({ title: `Unpublish ${c.title}?`, body: `It disappears from the catalog and stops taking enrollments. The ${enrolled} enrolled student${enrolled === 1 ? '' : 's'} keep access and progress.`, confirmLabel: 'Unpublish', tone: 'primary', onConfirm: () => setStatus(c, 'draft') }) }]
        : []),
      ...(c.status !== 'archived' ? [{ label: 'Archive', icon: <Archive />, onSelect: () => confirm({ title: `Archive ${c.title}?`, body: 'Archived courses are hidden from the catalog and instructors’ active lists. Enrolled students keep access, and records and certificates stay intact. You can restore it later.', confirmLabel: 'Archive course', tone: 'primary', onConfirm: () => setStatus(c, 'archived') }) }] : [{ label: 'Restore to draft', icon: <ArchiveRestore />, onSelect: () => setStatus(c, 'draft') }]),
      {
        label: 'Delete…',
        icon: <Trash2 />,
        danger: true,
        onSelect: () =>
          confirm({
            title: `Delete ${c.title}?`,
            body: data.enrollments.some((e) => e.courseId === c.id) ? 'This course has enrollment history, so it can’t be deleted — archive it instead to keep learner records.' : 'The course, its quizzes, assignments and announcements are permanently removed from this demo’s data. This can’t be undone.',
            confirmLabel: 'Delete course',
            onConfirm: () => report(toast, actions.deleteCourse(c.id), 'Course deleted'),
          }),
      },
    ]
  }
  return { items, dialog }
}

export default function CoursesPage() {
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const base = useStaffBase()
  const navigate = useNavigate()
  const courses = useTeachingCourses()
  const { items, dialog } = useCourseActions()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? '', status = params.get('status') ?? '', category = params.get('category') ?? '', instructor = params.get('instructor') ?? '', subject = params.get('subject') ?? ''
  const set = (k: string, v: string) => setParams((p) => (v ? p.set(k, v) : p.delete(k), p), { replace: true })
  const admin = me.role === 'admin'

  const rows = useMemo(() => {
    const term = q.toLowerCase()
    return courses
      .filter((c) => (!term || c.title.toLowerCase().includes(term) || c.tags.some((t) => t.includes(term))) && (!status || c.status === status) && (!category || c.categoryId === category) && (!instructor || c.instructorId === instructor) && (!subject || c.subjectId === subject))
      .map((c) => ({ ...c, lessons: lessonCount(c), enrolled: data.enrollments.filter((e) => e.courseId === c.id && counts(e.status)).length }))
  }, [courses, data.enrollments, q, status, category, instructor, subject])

  const exportCsv = () =>
    downloadCsv('courses.csv', [
      ['Title', 'Status', 'Category', 'Subject', 'Instructor', 'Lessons', 'Enrolled', 'Price', 'Last updated'],
      ...rows.map((c) => [c.title, c.status, look.category(c.categoryId)?.name, look.subject(c.subjectId)?.code, look.user(c.instructorId)?.name, c.lessons, c.enrolled, c.price, c.updatedAt.slice(0, 10)]),
    ])

  return (
    <div>
      <PageHeader
        title={admin ? 'Courses' : 'My Courses'}
        description={admin ? 'Every course on the platform. Courses waiting for review need an administrator to publish them.' : data.settings.publication.requireReview ? 'Courses you teach. Publishing sends a course to an administrator for review.' : 'Courses you teach.'}
        actions={
          <>
            <Button icon={<Download />} onClick={exportCsv}>Export CSV</Button>
            <ButtonLink variant="primary" icon={<Plus />} to={`${base}/builder`}>New course</ButtonLink>
          </>
        }
      />
      <Toolbar>
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Search courses or tags" className="w-full sm:w-64" />
        <FilterSelect label="Status" value={status} onChange={(v) => set('status', v)}>
          <option value="">All statuses</option>
          {(Object.keys(courseStatusMeta) as CourseStatus[]).map((s) => <option key={s} value={s}>{courseStatusMeta[s].label} ({courses.filter((c) => c.status === s).length})</option>)}
        </FilterSelect>
        <FilterSelect label="Category" value={category} onChange={(v) => set('category', v)}>
          <option value="">All categories</option>
          {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>
        {data.settings.academic.subjects && (
          <FilterSelect label="Subject" value={subject} onChange={(v) => set('subject', v)}>
            <option value="">All subjects</option>
            {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </FilterSelect>
        )}
        {admin && (
          <FilterSelect label="Instructor" value={instructor} onChange={(v) => set('instructor', v)}>
            <option value="">All instructors</option>
            {data.users.filter((u) => u.role === 'instructor').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </FilterSelect>
        )}
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Courses"
          rows={rows}
          initialSort={{ key: 'updated', dir: 'desc' }}
          onRowClick={(c) => navigate(`${base}/builder?course=${c.id}`)}
          empty={<EmptyState icon={<BookOpen />} title="No courses match" body="Try another filter, or create a course." action={<ButtonLink variant="primary" to={`${base}/builder`}>New course</ButtonLink>} />}
          columns={[
            {
              key: 'title', header: 'Course', sort: (c) => c.title,
              cell: (c) => (
                <div className="flex items-center gap-3">
                  <CourseArt course={c} className="aspect-[4/3] w-14 shrink-0 rounded-md" showIcon={false} />
                  <span className="min-w-0">
                    <Link to={`${base}/builder?course=${c.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-72 truncate font-medium hover:text-primary">{c.title}</Link>
                    <span className="block text-xs text-muted">{look.subject(c.subjectId)?.code ?? 'No subject'} · {c.price ? `$${c.price}` : 'Free'}</span>
                  </span>
                </div>
              ),
            },
            { key: 'category', header: 'Category', sort: (c) => look.category(c.categoryId)?.name ?? '', cell: (c) => <span className="text-muted">{look.category(c.categoryId)?.name}</span> },
            ...(admin ? [{ key: 'instructor', header: 'Instructor', sort: (c: (typeof rows)[0]) => look.user(c.instructorId)?.name ?? '', cell: (c: (typeof rows)[0]) => { const u = look.user(c.instructorId); return u ? <span className="flex items-center gap-2"><Avatar user={u} size="xs" />{u.name}</span> : '—' } }] : []),
            { key: 'lessons', header: 'Lessons', align: 'right' as const, sort: (c) => c.lessons, cell: (c) => c.lessons },
            { key: 'enrolled', header: 'Enrolled', align: 'right' as const, sort: (c) => c.enrolled, cell: (c) => c.enrolled },
            { key: 'status', header: 'Status', sort: (c) => c.status, cell: (c) => <StatusBadge meta={courseStatusMeta[c.status]} title={courseStatusMeta[c.status].hint} /> },
            { key: 'updated', header: 'Last updated', sort: (c) => c.updatedAt, cell: (c) => <span className="text-muted">{formatDate(c.updatedAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
            { key: 'actions', header: <span className="sr-only">Actions</span>, cell: (c) => <RowMenu label={`Actions for ${c.title}`} items={items(c)} /> },
          ]}
        />
      </div>
      {dialog}
    </div>
  )
}
