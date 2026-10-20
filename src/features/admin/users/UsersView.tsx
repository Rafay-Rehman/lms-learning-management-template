import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, Eye, PenSquare, Plus, Power, Users } from 'lucide-react'
import type { Role, User } from '@/types'
import { Avatar, Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { formatDate, timeAgo } from '@/lib/date'
import { counts } from '@/services/learning'
import { roleLabel } from '@/services/permissions'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'
import { blankUser, UserDialog } from './UserForm'

const titles: Record<Role, [string, string]> = {
  student: ['Students', 'Learner accounts with their enrollments and activity.'],
  instructor: ['Instructors', 'Teaching staff, the courses they own and the subjects they’re assigned to.'],
  admin: ['Administrators', 'Accounts that can manage the whole platform. Keep this list short.'],
}

export function UsersView({ role }: { role: Role }) {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, dialog] = useConfirm()
  const [editing, setEditing] = useState<User | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [dep, setDep] = useState('')
  const [group, setGroup] = useState('')
  const rows = useMemo(
    () =>
      data.users
        .filter((u) => u.role === role && (!q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q.toLowerCase())) && (!status || (status === 'active') === u.active) && (!dep || u.departmentId === dep) && (!group || data.groups.find((g) => g.id === group)?.studentIds.includes(u.id)))
        .map((u) => ({ ...u, enrollments: data.enrollments.filter((e) => e.userId === u.id && counts(e.status)).length, teaching: data.courses.filter((c) => c.instructorId === u.id).length, certs: data.certificates.filter((c) => c.userId === u.id && c.status === 'valid').length })),
    [data, role, q, status, dep, group],
  )
  const toggle = (u: User) =>
    confirm({
      title: `${u.active ? 'Deactivate' : 'Activate'} ${u.name}?`,
      body: u.active ? 'They can’t be switched to or enrolled while deactivated. Their enrollments, grades and certificates are kept.' : 'The account becomes usable again.',
      confirmLabel: u.active ? 'Deactivate' : 'Activate',
      tone: u.active ? 'danger' : 'primary',
      onConfirm: () => report(toast, actions.saveUser({ ...u, active: !u.active }), `${u.name} ${u.active ? 'deactivated' : 'activated'}`),
    })
  const [title, description] = titles[role]
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button icon={<Download />} onClick={() => downloadCsv(`${title.toLowerCase()}.csv`, [['Name', 'Email', 'Role', 'Title', 'Department', 'Status', role === 'student' ? 'Enrollments' : 'Courses', 'Joined', 'Last active'], ...rows.map((u) => [u.name, u.email, u.role, u.title, look.department(u.departmentId)?.name, u.active ? 'active' : 'deactivated', role === 'student' ? u.enrollments : u.teaching, u.createdAt.slice(0, 10), u.lastActiveAt?.slice(0, 10)])])}>Export CSV</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing(blankUser(data, role))}>New {roleLabel[role].toLowerCase()}</Button>
          </>
        }
      />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search name or email" className="w-full sm:w-64" />
        <FilterSelect label="Status" value={status} onChange={setStatus}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Deactivated</option></FilterSelect>
        {role !== 'student' && data.settings.academic.departments && <FilterSelect label="Department" value={dep} onChange={setDep}><option value="">All departments</option>{data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</FilterSelect>}
        {role === 'student' && <FilterSelect label="Group" value={group} onChange={setGroup}><option value="">All groups & batches</option>{data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</FilterSelect>}
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label={title}
          rows={rows}
          initialSort={{ key: 'name', dir: 'asc' }}
          onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
          empty={<EmptyState icon={<Users />} title="No accounts match" />}
          columns={[
            { key: 'name', header: 'Name', sort: (u) => u.name, cell: (u) => <span className="flex items-center gap-2.5"><Avatar user={u} size="sm" /><span><span className="block font-medium">{u.name}</span><span className="block text-xs text-muted">{u.email}</span></span></span> },
            ...(role === 'student'
              ? [
                  { key: 'enr', header: 'Enrollments', align: 'right' as const, sort: (u: (typeof rows)[0]) => u.enrollments, cell: (u: (typeof rows)[0]) => u.enrollments },
                  { key: 'certs', header: 'Certificates', align: 'right' as const, sort: (u: (typeof rows)[0]) => u.certs, cell: (u: (typeof rows)[0]) => u.certs },
                ]
              : [
                  { key: 'title', header: 'Title', sort: (u: (typeof rows)[0]) => u.title, cell: (u: (typeof rows)[0]) => <span className="block max-w-60 truncate text-muted">{u.title || '—'}</span> },
                  ...(role === 'instructor' ? [{ key: 'courses', header: 'Courses', align: 'right' as const, sort: (u: (typeof rows)[0]) => u.teaching, cell: (u: (typeof rows)[0]) => u.teaching }] : []),
                ]),
            { key: 'joined', header: 'Joined', sort: (u) => u.createdAt, cell: (u) => <span className="text-muted">{formatDate(u.createdAt.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}</span> },
            { key: 'seen', header: 'Last active', sort: (u) => u.lastActiveAt ?? '', cell: (u) => <span className="text-muted">{u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'Never'}</span> },
            { key: 'status', header: 'Status', sort: (u) => Number(u.active), cell: (u) => (u.active ? <Badge color="var(--success)">Active</Badge> : <Badge color="var(--faint)">Deactivated</Badge>) },
            { key: 'actions', header: <span className="sr-only">Actions</span>, cell: (u) => <RowMenu label={`Actions for ${u.name}`} items={[{ label: 'View details', icon: <Eye />, onSelect: () => navigate(`/admin/users/${u.id}`) }, { label: 'Edit / change role', icon: <PenSquare />, onSelect: () => setEditing(u) }, { label: u.active ? 'Deactivate…' : 'Activate', icon: <Power />, danger: u.active, onSelect: () => toggle(u) }]} /> },
          ]}
        />
      </div>
      <UserDialog value={editing} onClose={() => setEditing(null)} />
      {dialog}
    </div>
  )
}
