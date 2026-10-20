import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Layers } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { formatMinutes } from '@/lib/date'
import { useStaffBase, useTeachingCourses } from '@/state/selectors'

/** Course sections (modules) across all courses. Rename and reorder them in the builder. */
export default function ModulesPage() {
  const courses = useTeachingCourses()
  const base = useStaffBase()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [course, setCourse] = useState('')
  const rows = useMemo(
    () => courses.flatMap((c) => c.sections.map((s, i) => ({ id: s.id, title: s.title, courseId: c.id, course: c.title, position: i + 1, of: c.sections.length, lessons: s.lessons.length, required: s.lessons.filter((l) => l.required).length, minutes: s.lessons.reduce((t, l) => t + l.durationMinutes, 0) })))
      .filter((s) => (!q || s.title.toLowerCase().includes(q.toLowerCase())) && (!course || s.courseId === course)),
    [courses, q, course],
  )
  return (
    <div>
      <PageHeader title="Sections / Modules" description="Each course is organised into sections. Select one to edit the curriculum." />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search sections" className="w-full sm:w-64" />
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Sections"
          rows={rows}
          pageSize={20}
          onRowClick={(s) => navigate(`${base}/builder?course=${s.courseId}&tab=curriculum`)}
          empty={<EmptyState icon={<Layers />} title="No sections match" />}
          columns={[
            { key: 'title', header: 'Section', sort: (s) => s.title, cell: (s) => <span className="font-medium">{s.title}</span> },
            { key: 'course', header: 'Course', sort: (s) => s.course, cell: (s) => <span className="text-muted">{s.course}</span> },
            { key: 'pos', header: 'Position', sort: (s) => s.position, cell: (s) => `${s.position} of ${s.of}` },
            { key: 'lessons', header: 'Lessons', align: 'right', sort: (s) => s.lessons, cell: (s) => `${s.lessons} (${s.required} required)` },
            { key: 'minutes', header: 'Length', align: 'right', sort: (s) => s.minutes, cell: (s) => formatMinutes(s.minutes) },
          ]}
        />
      </div>
    </div>
  )
}
