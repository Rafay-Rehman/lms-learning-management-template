import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Award, BadgeCheck, Ban, Download, ExternalLink, RotateCcw } from 'lucide-react'
import type { Certificate } from '@/types'
import { Avatar, Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Field, Textarea } from '@/components/ui/Field'
import { Dialog } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Section, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/date'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function AdminCertificatesPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [course, setCourse] = useState('')
  const [revoking, setRevoking] = useState<Certificate | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const rows = data.certificates.filter((c) => (!q || [c.code, c.studentName, c.courseTitle].some((s) => s.toLowerCase().includes(q.toLowerCase()))) && (!status || c.status === status) && (!course || c.courseId === course))
  // Completed enrollments in certificate courses that have no certificate (e.g. the course started awarding one later).
  const eligible = data.enrollments.filter((e) => e.status === 'completed' && look.course(e.courseId)?.awardsCertificate && !data.certificates.some((c) => c.enrollmentId === e.id))
  const revoke = () => {
    const r = actions.setCertificateStatus(revoking!.id, 'revoked', reason)
    if (!r.ok) return setError(Object.values(r.errors)[0])
    toast(`Certificate ${revoking!.code} revoked — the verification page now shows it as revoked`)
    setRevoking(null)
  }
  return (
    <div>
      <PageHeader title="Certificates" description="Issued automatically when a student completes a course that awards one. Revoking keeps the record and shows it as revoked on the public verification page." actions={<Button icon={<Download />} onClick={() => downloadCsv('certificates.csv', [['Code', 'Student', 'Course', 'Instructor', 'Issued', 'Status', 'Revocation reason'], ...rows.map((c) => [c.code, c.studentName, c.courseTitle, c.instructorName, c.issuedAt.slice(0, 10), c.status, c.revokedReason])])}>Export CSV</Button>} />
      {eligible.length > 0 && (
        <Section title="Completed without a certificate" className="mb-6">
          <ul className="divide-y divide-line">{eligible.map((e) => <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm"><span className="flex-1">{look.user(e.userId)?.name} · {look.course(e.courseId)?.title}</span><Button size="sm" icon={<Award />} onClick={() => report(toast, actions.issueCertificate(e.id), 'Certificate issued')}>Issue certificate</Button></li>)}</ul>
        </Section>
      )}
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search code, student or course" className="w-full sm:w-72" />
        <FilterSelect label="Status" value={status} onChange={setStatus}><option value="">Valid and revoked</option><option value="valid">Valid</option><option value="revoked">Revoked</option></FilterSelect>
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{data.courses.filter((c) => c.awardsCertificate).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label="Certificates"
          rows={rows}
          initialSort={{ key: 'issued', dir: 'desc' }}
          empty={<EmptyState icon={<Award />} title="No certificates match" />}
          columns={[
            { key: 'code', header: 'Certificate ID', sort: (c) => c.code, cell: (c) => <span className="font-mono text-[13px] font-medium">{c.code}</span> },
            { key: 'student', header: 'Student', sort: (c) => c.studentName, cell: (c) => { const u = look.user(c.userId); return <span className="flex items-center gap-2">{u && <Avatar user={u} size="xs" />}{c.studentName}</span> } },
            { key: 'course', header: 'Course', sort: (c) => c.courseTitle, cell: (c) => <span className="block max-w-64 truncate text-muted">{c.courseTitle}</span> },
            { key: 'issued', header: 'Issued', sort: (c) => c.issuedAt, cell: (c) => <span className="text-muted">{formatDate(c.issuedAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
            { key: 'status', header: 'Status', sort: (c) => c.status, cell: (c) => (c.status === 'valid' ? <Badge color="var(--success)">Valid</Badge> : <Badge color="var(--danger)" title={c.revokedReason}>Revoked</Badge>) },
            { key: 'actions', header: <span className="sr-only">Actions</span>, cell: (c) => <RowMenu label={`Actions for ${c.code}`} items={[{ label: 'Open verification page', icon: <ExternalLink />, onSelect: () => navigate(`/verify/${c.code}`) }, c.status === 'valid' ? { label: 'Revoke…', icon: <Ban />, danger: true, onSelect: () => (setRevoking(c), setReason(''), setError('')) } : { label: 'Reinstate', icon: <RotateCcw />, onSelect: () => report(toast, actions.setCertificateStatus(c.id, 'valid'), 'Certificate reinstated') }]} /> },
          ]}
        />
      </div>
      <Dialog open={!!revoking} onClose={() => setRevoking(null)} title={`Revoke ${revoking?.code}?`} size="sm" footer={<><Button onClick={() => setRevoking(null)}>Cancel</Button><Button variant="danger" icon={<BadgeCheck />} onClick={revoke}>Revoke certificate</Button></>}>
        <div className="p-5"><Field label="Reason" required error={error} hint="Shown publicly on the verification page.">{(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field></div>
      </Dialog>
    </div>
  )
}
