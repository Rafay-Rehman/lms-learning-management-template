import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, ListTree } from 'lucide-react'
import type { LessonType } from '@/types'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { lessonIcon, lessonTypeLabel } from '@/features/public/CourseDetailPage'
import { downloadCsv } from '@/lib/csv'
import { useStaffBase, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

/** Every lesson across the courses you manage. Editing happens in the course builder. */
export default function LessonsPage() {
  const { data } = useStore()
  const courses = useTeachingCourses()
  const base = useStaffBase()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [course, setCourse] = useState('')
  const [type, setType] = useState('')
  const rows = useMemo(
    () =>
      courses.flatMap((c) =>
        c.sections.flatMap((s, si) =>
          s.lessons.map((l, li) => ({ ...l, courseId: c.id, course: c.title, section: s.title, position: `${si + 1}.${li + 1}`, completions: data.enrollments.filter((e) => e.courseId === c.id && e.progress[l.id]).length })),
        ),
      ).filter((l) => (!q || l.title.toLowerCase().includes(q.toLowerCase())) && (!course || l.courseId === course) && (!type || l.type === type)),
    [courses, data.enrollments, q, course, type],
  )
  return (
    <div>
      <PageHeader title="Lessons & Content" description={`${rows.length} lessons. Select a lesson to edit it in the course builder.`} actions={<Button icon={<Download />} onClick={() => downloadCsv('lessons.csv', [['Course', 'Section', 'Position', 'Lesson', 'Type', 'Minutes', 'Required', 'Preview', 'Completions'], ...rows.map((l) => [l.course, l.section, l.position, l.title, l.type, l.durationMinutes, l.required ? 'yes' : 'no', l.preview ? 'yes' : 'no', l.completions])])}>Export CSV</Button>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search lessons" className="w-full sm:w-64" />
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        <FilterSelect label="Type" value={type} onChange={setType}><option value="">All types</option>{(Object.keys(lessonTypeLabel) as LessonType[]).map((t) => <option key={t} value={t}>{lessonTypeLabel[t]}</option>)}</FilterSelect>
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Lessons"
          rows={rows}
          pageSize={20}
          onRowClick={(l) => navigate(`${base}/builder?course=${l.courseId}&tab=curriculum`)}
          empty={<EmptyState icon={<ListTree />} title="No lessons match" />}
          columns={[
            { key: 'title', header: 'Lesson', sort: (l) => l.title, cell: (l) => { const I = lessonIcon[l.type]; return <span className="flex items-center gap-2.5"><I className="size-4 text-faint" /><span className="max-w-72 truncate font-medium">{l.title}</span></span> } },
            { key: 'course', header: 'Course', sort: (l) => l.course, cell: (l) => <span className="text-muted">{l.course}</span> },
            { key: 'section', header: 'Section', sort: (l) => l.position, cell: (l) => <span className="text-muted">{l.position} · {l.section}</span> },
            { key: 'type', header: 'Type', sort: (l) => l.type, cell: (l) => lessonTypeLabel[l.type] },
            { key: 'min', header: 'Minutes', align: 'right', sort: (l) => l.durationMinutes, cell: (l) => l.durationMinutes },
            { key: 'req', header: 'Required', sort: (l) => Number(l.required), cell: (l) => (l.required ? <Badge color="var(--primary)">Required</Badge> : <Badge>Optional</Badge>) },
            { key: 'done', header: 'Completions', align: 'right', sort: (l) => l.completions, cell: (l) => l.completions },
          ]}
        />
      </div>
    </div>
  )
}
