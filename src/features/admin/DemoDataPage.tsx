import { useNavigate } from 'react-router'
import { Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Overlay'
import { PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/state/store'

export default function DemoDataPage() {
  const { data, actions, setPrefs, persisted } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, dialog] = useConfirm()
  const size = new Blob([JSON.stringify(data)]).size
  const counts: [string, number][] = [['Users', data.users.length], ['Courses', data.courses.length], ['Subjects', data.subjects.length], ['Enrollments', data.enrollments.length], ['Quiz attempts', data.attempts.length], ['Submissions', data.submissions.length], ['Certificates', data.certificates.length], ['Learning events', data.events.length], ['Notifications', data.notifications.length]]
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Demo Data Management" description="This template stores everything in your browser’s localStorage. Nothing is sent to a server." />
      <div className="space-y-6">
        <Section title="What’s stored">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{counts.map(([k, v]) => <div key={k} className="rounded-[var(--r-ctl)] bg-surface-2 p-3"><dt className="text-xs text-muted">{k}</dt><dd className="numeral text-xl font-semibold">{v}</dd></div>)}</dl>
          <p className="mt-3 text-sm text-muted">About {Math.round(size / 1024)} KB · seeded relative to {data.seededOn} · {persisted ? 'saving normally' : 'this browser is refusing to save'}.</p>
        </Section>
        <Section title="Back up">
          <p className="text-sm text-muted">Download the current demo data as JSON — useful as fixture data when you connect a backend.</p>
          <Button className="mt-3" icon={<Download />} onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `lectern-demo-data-${data.seededOn}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) }}>Download JSON</Button>
        </Section>
        <Section title="Reset demo data">
          <p className="text-sm text-muted">Replaces all data — courses, people, progress, grades, settings, theme and website content — with the original sample data, dated relative to today.</p>
          <Button className="mt-3" variant="danger" icon={<RotateCcw />} onClick={() => confirm({ title: 'Reset all demo data?', body: 'Every change made in this browser is lost. This can’t be undone.', confirmLabel: 'Reset demo data', onConfirm: () => { actions.reset(); setPrefs({ mode: null, sidebarCollapsed: null }); toast('Demo data restored'); navigate('/learn') } })}>Reset demo data</Button>
        </Section>
      </div>
      {dialog}
    </div>
  )
}
