import { useState } from 'react'
import { CheckCheck, Trash2 } from 'lucide-react'
import type { NotificationKind } from '@/types'
import { Button } from '@/components/ui/Button'
import { FilterSelect, PageHeader, Segmented } from '@/components/ui/misc'
import { useMyNotifications } from '@/state/selectors'
import { useStore } from '@/state/store'
import { kindMeta, NotificationList } from './NotificationList'

export default function NotificationsPage() {
  const { actions } = useStore()
  const all = useMyNotifications()
  const [kind, setKind] = useState<NotificationKind | ''>('')
  const [read, setRead] = useState<'all' | 'unread'>('all')
  const items = all.filter((n) => (!kind || n.kind === kind) && (read === 'all' || !n.read))
  const unread = all.filter((n) => !n.read).length
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="In-app notifications only. This demo doesn’t send email or push notifications — connect a delivery service for that."
        actions={
          <>
            <Button icon={<CheckCheck />} disabled={!unread} onClick={() => actions.readNotifications('all')}>Mark all as read</Button>
            <Button variant="ghost" icon={<Trash2 />} disabled={!items.some((n) => n.read)} onClick={() => items.filter((n) => n.read).forEach((n) => actions.deleteNotification(n.id))}>Clear read</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented label="Show" value={read} onChange={setRead} options={[{ value: 'all', label: `All (${all.length})` }, { value: 'unread', label: `Unread (${unread})` }]} />
        <FilterSelect label="Type" value={kind} onChange={(v) => setKind(v as NotificationKind | '')}>
          <option value="">All types</option>
          {(Object.keys(kindMeta) as NotificationKind[]).map((k) => <option key={k} value={k}>{kindMeta[k].label}</option>)}
        </FilterSelect>
      </div>
      <div className="panel p-2"><NotificationList items={items} /></div>
    </div>
  )
}
