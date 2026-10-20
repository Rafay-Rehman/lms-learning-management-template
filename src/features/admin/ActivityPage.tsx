import { useState } from 'react'
import { Link } from 'react-router'
import { Activity, Download } from 'lucide-react'
import type { AuditEntry } from '@/types'
import { Avatar, Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Section, Toolbar } from '@/components/ui/misc'
import { downloadCsv } from '@/lib/csv'
import { timeAgo } from '@/lib/date'
import { useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'

const areas: Record<AuditEntry['area'], string> = { academic: 'Academic', people: 'People', course: 'Courses', assessment: 'Assessments', certificate: 'Certificates', platform: 'Platform', enrollment: 'Enrollments' }

export default function ActivityPage() {
  const { data } = useStore()
  const look = useLookup()
  const [q, setQ] = useState('')
  const [area, setArea] = useState('')
  const [actor, setActor] = useState('')
  const [shown, setShown] = useState(40)
  const rows = data.audit.filter((a) => (!q || a.message.toLowerCase().includes(q.toLowerCase())) && (!area || a.area === area) && (!actor || a.actorId === actor))
  const actors = [...new Set(data.audit.map((a) => a.actorId))].map((id) => look.user(id)).filter(Boolean)
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Recent Activity" description="An audit trail of changes made through this demo. In production, record this on the server so it can’t be altered." actions={<Button icon={<Download />} onClick={() => downloadCsv('activity-log.csv', [['When', 'Who', 'Area', 'What'], ...rows.map((a) => [a.at, look.user(a.actorId)?.name, a.area, a.message])])}>Export CSV</Button>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search activity" className="w-full sm:w-64" />
        <FilterSelect label="Area" value={area} onChange={setArea}><option value="">All areas</option>{Object.entries(areas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</FilterSelect>
        <FilterSelect label="Person" value={actor} onChange={setActor}><option value="">Everyone</option>{actors.map((u) => <option key={u!.id} value={u!.id}>{u!.name}</option>)}</FilterSelect>
      </Toolbar>
      <Section title={`${rows.length} events`}>
        {rows.length ? (
          <ol className="relative space-y-4 border-l border-line pl-6">
            {rows.slice(0, shown).map((a) => { const u = look.user(a.actorId); return (
              <li key={a.id} className="relative">
                <span className="absolute top-0.5 -left-[35px]">{u && <Avatar user={u} size="xs" className="ring-4 ring-surface" />}</span>
                <p className="text-sm"><Link to={a.link} className="hover:text-primary">{a.message}</Link></p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">{u?.name} · {timeAgo(a.at)} <Badge>{areas[a.area]}</Badge></p>
              </li>
            ) })}
          </ol>
        ) : <EmptyState icon={<Activity />} title="No activity matches" />}
        {shown < rows.length && <Button className="mt-5" onClick={() => setShown(shown + 40)}>Show more</Button>}
      </Section>
    </div>
  )
}
