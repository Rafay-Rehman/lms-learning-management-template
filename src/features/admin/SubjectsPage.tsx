import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Archive, ArchiveRestore, Download, Eye, Library, PenSquare, Plus, Trash2 } from 'lucide-react'
import type { Subject } from '@/types'
import { Avatar, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { iconFor } from '@/components/ui/icons'
import { useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/date'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { blankSubject, SubjectDialog, subjectStats, subjectStatusMeta } from './SubjectForm'

export default function SubjectsPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, dialog] = useConfirm()
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const set = (k: string, v: string) => setParams((p) => (v ? p.set(k, v) : p.delete(k), p), { replace: true })
  const [editing, setEditing] = useState<Subject | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const ac = data.settings.academic

  const rows = useMemo(() => {
    const term = get('q').toLowerCase()
    return data.subjects
      .map((s) => ({ ...s, stats: subjectStats(data, s.id) }))
      .filter((s) => (!term || s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term)) && (!get('category') || s.categoryId === get('category')) && (!get('department') || s.departmentId === get('department')) && (!get('year') || s.yearId === get('year')) && (!get('term') || s.termId === get('term')) && (!get('instructor') || s.instructorIds.includes(get('instructor'))) && (!get('status') || s.status === get('status')))
  }, [data, params]) // eslint-disable-line react-hooks/exhaustive-deps

  const picked = rows.filter((r) => selected.has(r.id))
  const csv = (list: typeof rows) =>
    downloadCsv('subjects.csv', [
      ['Code', 'Name', 'Category', 'Department', 'Academic year', 'Term', 'Level', 'Instructors', 'Courses', 'Lessons', 'Students', 'Status', 'Created', 'Updated'],
      ...list.map((s) => [s.code, s.name, data.subjectCategories.find((c) => c.id === s.categoryId)?.name, look.department(s.departmentId)?.name, look.year(s.yearId)?.name, look.term(s.termId)?.name, s.level, s.instructorIds.map((i) => look.user(i)?.name).join('; '), s.stats.courses.length, s.stats.lessons, s.stats.students, s.status, s.createdAt.slice(0, 10), s.updatedAt.slice(0, 10)]),
    ])
  const bulkStatus = (status: Subject['status']) => {
    if (report(toast, actions.setSubjectStatus([...selected], status), `${selected.size} subject${selected.size === 1 ? '' : 's'} ${status === 'archived' ? 'archived' : 'restored'}`)) setSelected(new Set())
  }
  const remove = (ids: string[]) =>
    confirm({
      title: ids.length > 1 ? `Delete ${ids.length} subjects?` : 'Delete this subject?',
      body: 'Only subjects with no courses or question-bank history can be deleted. Archive anything that has history — it stays in reports and on learners’ records.',
      confirmLabel: 'Delete',
      onConfirm: () => report(toast, actions.deleteSubjects(ids), `Deleted ${ids.length} subject${ids.length === 1 ? '' : 's'}`) && setSelected(new Set()),
    })

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Academic areas that group related courses — distinct from courses themselves. A subject can hold several courses across terms."
        actions={
          <>
            <Button icon={<Download />} onClick={() => csv(rows)}>Export CSV</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing(blankSubject(data))}>New subject</Button>
          </>
        }
      />
      <Toolbar>
        <SearchInput value={get('q')} onChange={(v) => set('q', v)} placeholder="Search name or code" className="w-full sm:w-56" />
        <FilterSelect label="Status" value={get('status')} onChange={(v) => set('status', v)}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></FilterSelect>
        <FilterSelect label="Category" value={get('category')} onChange={(v) => set('category', v)}><option value="">All categories</option>{data.subjectCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</FilterSelect>
        {ac.departments && <FilterSelect label="Department" value={get('department')} onChange={(v) => set('department', v)}><option value="">All departments</option>{data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</FilterSelect>}
        {ac.years && <FilterSelect label="Academic year" value={get('year')} onChange={(v) => set('year', v)}><option value="">All years</option>{data.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</FilterSelect>}
        {ac.terms && <FilterSelect label="Term" value={get('term')} onChange={(v) => set('term', v)}><option value="">All terms</option>{data.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</FilterSelect>}
        <FilterSelect label="Instructor" value={get('instructor')} onChange={(v) => set('instructor', v)}><option value="">All instructors</option>{data.users.filter((u) => u.role === 'instructor').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</FilterSelect>
      </Toolbar>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--r-ctl)] border border-primary/30 bg-primary-soft px-4 py-2 text-sm" role="region" aria-label="Bulk actions">
          <span className="font-medium">{selected.size} selected</span>
          <span className="flex-1" />
          <Button size="sm" icon={<Archive />} onClick={() => bulkStatus('archived')}>Archive</Button>
          <Button size="sm" icon={<ArchiveRestore />} onClick={() => bulkStatus('active')}>Restore as active</Button>
          <Button size="sm" icon={<Download />} onClick={() => csv(picked)}>Export selected</Button>
          <Button size="sm" variant="danger" icon={<Trash2 />} onClick={() => remove([...selected])}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="panel overflow-hidden">
        <DataTable
          label="Subjects"
          rows={rows}
          initialSort={{ key: 'name', dir: 'asc' }}
          selected={selected}
          onSelect={setSelected}
          onRowClick={(s) => navigate(`/admin/subjects/${s.id}`)}
          empty={<EmptyState icon={<Library />} title={data.subjects.length ? 'No subjects match' : 'No subjects yet'} body={data.subjects.length ? 'Clear some filters to see more.' : 'Create the first subject.'} action={<Button variant="primary" onClick={() => setEditing(blankSubject(data))}>New subject</Button>} />}
          columns={[
            {
              key: 'name', header: 'Subject', sort: (s) => s.name,
              cell: (s) => { const I = iconFor(s.icon); return <span className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-[var(--r-ctl)] bg-primary-soft text-primary"><I className="size-4" /></span><span><Link to={`/admin/subjects/${s.id}`} onClick={(e) => e.stopPropagation()} className="block font-medium hover:text-primary">{s.name}</Link><span className="block text-xs text-muted">{s.code} · {s.level}</span></span></span> },
            },
            { key: 'category', header: 'Category', sort: (s) => data.subjectCategories.find((c) => c.id === s.categoryId)?.name ?? '', cell: (s) => <span className="text-muted">{data.subjectCategories.find((c) => c.id === s.categoryId)?.name ?? '—'}</span> },
            ...(ac.departments ? [{ key: 'dep', header: 'Department', sort: (s: (typeof rows)[0]) => look.department(s.departmentId)?.name ?? '', cell: (s: (typeof rows)[0]) => <span className="text-muted">{look.department(s.departmentId)?.name ?? '—'}</span> }] : []),
            { key: 'inst', header: 'Instructors', cell: (s) => <span className="flex -space-x-1.5">{s.instructorIds.map((i) => look.user(i)).filter(Boolean).map((u) => <span key={u!.id} title={u!.name}><Avatar user={u!} size="xs" className="ring-2 ring-surface" /></span>)}{!s.instructorIds.length && <span className="text-faint">—</span>}</span> },
            ...(ac.years ? [{ key: 'period', header: 'Period', sort: (s: (typeof rows)[0]) => look.year(s.yearId)?.name ?? '', cell: (s: (typeof rows)[0]) => <span className="text-muted">{look.year(s.yearId)?.name ?? 'Any year'}{s.termId && ` · ${look.term(s.termId)?.name}`}</span> }] : []),
            { key: 'courses', header: 'Courses', align: 'right', sort: (s) => s.stats.courses.length, cell: (s) => s.stats.courses.length },
            { key: 'students', header: 'Students', align: 'right', sort: (s) => s.stats.students, cell: (s) => s.stats.students },
            { key: 'status', header: 'Status', sort: (s) => s.status, cell: (s) => <StatusBadge meta={subjectStatusMeta[s.status]} /> },
            { key: 'created', header: 'Created', sort: (s) => s.createdAt, cell: (s) => <span className="text-muted">{formatDate(s.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
            {
              key: 'actions', header: <span className="sr-only">Actions</span>,
              cell: (s) => (
                <RowMenu
                  label={`Actions for ${s.name}`}
                  items={[
                    { label: 'View details', icon: <Eye />, onSelect: () => navigate(`/admin/subjects/${s.id}`) },
                    { label: 'Edit', icon: <PenSquare />, onSelect: () => setEditing(s) },
                    s.status === 'archived'
                      ? { label: 'Restore', icon: <ArchiveRestore />, onSelect: () => report(toast, actions.setSubjectStatus([s.id], 'active'), `${s.name} restored`) }
                      : { label: 'Archive', icon: <Archive />, onSelect: () => report(toast, actions.setSubjectStatus([s.id], 'archived'), `${s.name} archived — its courses and history are kept`) },
                    'divider',
                    { label: 'Delete…', icon: <Trash2 />, danger: true, onSelect: () => remove([s.id]) },
                  ]}
                />
              ),
            },
          ]}
        />
      </div>
      <SubjectDialog value={editing} onClose={() => setEditing(null)} onSaved={(id) => !data.subjects.some((x) => x.id === id) && navigate(`/admin/subjects/${id}`)} />
      {dialog}
    </div>
  )
}
