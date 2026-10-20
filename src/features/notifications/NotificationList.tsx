import { Link } from 'react-router'
import { Award, Bell, BookOpenCheck, CalendarClock, CircleCheckBig, ClipboardCheck, Megaphone, MessageSquareText, UserPlus } from 'lucide-react'
import type { Notification, NotificationKind } from '@/types'
import { EmptyState } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/date'
import { useStore } from '@/state/store'

export const kindMeta: Record<NotificationKind, { label: string; icon: typeof Bell; color: string }> = {
  enrollment: { label: 'Enrollments', icon: UserPlus, color: 'var(--primary)' },
  completion: { label: 'Completions', icon: CircleCheckBig, color: 'var(--success)' },
  deadline: { label: 'Deadlines', icon: CalendarClock, color: 'var(--warning)' },
  quiz: { label: 'Quiz results', icon: ClipboardCheck, color: 'var(--secondary)' },
  announcement: { label: 'Announcements', icon: Megaphone, color: 'var(--highlight)' },
  feedback: { label: 'Feedback & grading', icon: MessageSquareText, color: 'var(--secondary)' },
  certificate: { label: 'Certificates', icon: Award, color: 'var(--success)' },
  system: { label: 'Platform', icon: BookOpenCheck, color: 'var(--muted)' },
}

export function NotificationList({ items, compact, onOpen }: { items: Notification[]; compact?: boolean; onOpen?: () => void }) {
  const { actions } = useStore()
  if (!items.length) return <EmptyState icon={<Bell />} title="You’re all caught up" body="New activity on your courses will show up here." className="py-10" />
  return (
    <ul className={cn(!compact && 'divide-y divide-line')}>
      {items.map((n) => {
        const m = kindMeta[n.kind]
        return (
          <li key={n.id}>
            <Link
              to={n.link}
              onClick={() => {
                actions.readNotifications([n.id])
                onOpen?.()
              }}
              className={cn('flex gap-3 rounded-[var(--r-ctl)] px-3 py-2.5 hover:bg-surface-2', compact ? '' : 'py-3.5')}
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${m.color} 14%, transparent)`, color: m.color }}>
                <m.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm', n.read ? 'text-muted' : 'font-medium text-ink')}>{n.title}</span>
                <span className="block truncate text-[13px] text-muted">{n.body}</span>
                <span className="mt-0.5 block text-xs text-faint">{timeAgo(n.createdAt)} · {m.label}</span>
              </span>
              {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
