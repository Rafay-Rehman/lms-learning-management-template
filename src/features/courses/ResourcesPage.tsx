import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BookMarked, Download, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { downloadCsv } from '@/lib/csv'
import { isSafeUrl } from '@/services/courses'
import { useLookup, useStaffBase, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

/** Downloads and links attached to lessons, plus PDF and external-resource lessons. */
export default function ResourcesPage() {
  const { data } = useStore()
  const look = useLookup()
  const courses = useTeachingCourses()
  const base = useStaffBase()
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [kind, setKind] = useState('')
  const rows = useMemo(
    () =>
      courses.flatMap((c) =>
        c.sections.flatMap((s) =>
          s.lessons.flatMap((l) => [
            ...(l.type === 'pdf' || l.type === 'link' ? [{ id: l.id, title: l.title, kind: l.type === 'pdf' ? 'file' : 'link', url: l.url, lesson: l.title, course: c, as: 'Lesson' }] : []),
            ...l.resources.map((r) => ({ id: r.id, title: r.title, kind: r.kind, url: r.url, lesson: l.title, course: c, as: 'Attachment' })),
          ]),
        ),
      ).filter((r) => (!q || r.title.toLowerCase().includes(q.toLowerCase())) && (!subject || r.course.subjectId === subject) && (!kind || r.kind === kind)),
    [courses, q, subject, kind],
  )
  return (
    <div>
      <PageHeader title="Learning Resources" description="Files and links used across courses. Add or change them on the lesson in the course builder." actions={<Button icon={<Download />} onClick={() => downloadCsv('resources.csv', [['Title', 'Kind', 'URL', 'Course', 'Subject', 'Lesson'], ...rows.map((r) => [r.title, r.kind, r.url, r.course.title, look.subject(r.course.subjectId)?.code, r.lesson])])}>Export CSV</Button>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search resources" className="w-full sm:w-64" />
        {data.settings.academic.subjects && <FilterSelect label="Subject" value={subject} onChange={setSubject}><option value="">All subjects</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</FilterSelect>}
        <FilterSelect label="Kind" value={kind} onChange={setKind}><option value="">Files and links</option><option value="file">Files</option><option value="link">Links</option></FilterSelect>
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Resources"
          rows={rows}
          empty={<EmptyState icon={<BookMarked />} title="No resources match" />}
          columns={[
            { key: 'title', header: 'Resource', sort: (r) => r.title, cell: (r) => <span className="font-medium">{r.title}</span> },
            { key: 'kind', header: 'Kind', sort: (r) => r.kind, cell: (r) => <Badge color={r.kind === 'file' ? 'var(--secondary)' : 'var(--primary)'}>{r.kind === 'file' ? 'File' : 'Link'}</Badge> },
            { key: 'course', header: 'Course', sort: (r) => r.course.title, cell: (r) => <Link className="text-muted hover:text-primary" to={`${base}/builder?course=${r.course.id}&tab=curriculum`}>{r.course.title}</Link> },
            { key: 'lesson', header: 'Lesson', sort: (r) => r.lesson, cell: (r) => <span className="text-muted">{r.lesson} <span className="text-faint">({r.as.toLowerCase()})</span></span> },
            { key: 'open', header: <span className="sr-only">Open</span>, cell: (r) => (isSafeUrl(r.url) ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link hover:underline"><ExternalLink className="size-3.5" />Open</a> : <span className="text-danger">Unsafe URL</span>) },
          ]}
        />
      </div>
    </div>
  )
}
