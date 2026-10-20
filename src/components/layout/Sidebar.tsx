import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { navigation, visibleItems, type NavItem } from '@/app/navigation'
import { cn } from '@/lib/cn'
import { today } from '@/lib/date'
import { roleLabel } from '@/services/permissions'
import { isOpenTask, studentTasks } from '@/services/tasks'
import { useMe, useMyNotifications } from '@/state/selectors'
import { useStore } from '@/state/store'
import { Brand, Logo } from './Brand'

function useCounts() {
  const { data } = useStore()
  const me = useMe()
  const notes = useMyNotifications()
  return useMemo(() => {
    const mine = (courseId: string) => me.role === 'admin' || data.courses.find((c) => c.id === courseId)?.instructorId === me.id
    const quizCourse = (quizId: string) => data.quizzes.find((q) => q.id === quizId)?.courseId ?? ''
    const asCourse = (asId: string) => data.assignments.find((a) => a.id === asId)?.courseId ?? ''
    return {
      notifications: notes.filter((n) => !n.read).length,
      tasks: me.role === 'student' ? studentTasks(data, me.id, today()).filter(isOpenTask).length : 0,
      grading: data.attempts.filter((a) => a.status === 'pending_review' && mine(quizCourse(a.quizId))).length + data.submissions.filter((s) => (s.status === 'submitted' || s.status === 'late') && mine(asCourse(s.assignmentId))).length,
      review: data.courses.filter((c) => c.status === 'review').length,
    }
  }, [data, me, notes])
}

export function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const { data } = useStore()
  const me = useMe()
  const counts = useCounts()
  const { pathname } = useLocation()
  const groups = navigation[me.role]
    .map((g) => ({ ...g, items: visibleItems(g.items, data.website.hiddenNav, data.settings.academic) }))
    .filter((g) => g.items.length)
  const collapsible = me.role === 'admin'
  const activeGroup = groups.find((g) => g.items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/')))?.label
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const isOpen = (label: string) => !collapsible || collapsed || (open[label] ?? (label === activeGroup || label === 'Overview'))

  const link = (item: NavItem) => {
    const count = item.badge ? counts[item.badge] : 0
    const home = item.to.split('/').length === 2
    return (
      <li key={item.to}>
        <NavLink
          to={item.to}
          end={home}
          onClick={onNavigate}
          aria-label={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'group/link relative flex h-9 items-center gap-3 rounded-[var(--r-ctl)] text-[13.5px] font-medium transition-colors',
              collapsed ? 'justify-center' : 'px-2.5',
              isActive
                ? 'bg-[var(--nav-active)] text-nav-strong before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-highlight'
                : 'text-nav-ink hover:bg-[var(--nav-hover)] hover:text-nav-strong',
            )
          }
        >
          <item.icon className="size-[18px] shrink-0" strokeWidth={1.7} />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {count > 0 &&
            (collapsed ? (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-highlight" />
            ) : (
              <span className="rounded-full bg-highlight/90 px-1.5 text-[11px] font-semibold text-[#1a1404] tabular" aria-label={`${count} new`}>
                {count}
              </span>
            ))}
          {collapsed && (
            <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-bg opacity-0 shadow-md transition-opacity group-hover/link:opacity-100 group-focus-visible/link:opacity-100">
              {item.label}
            </span>
          )}
        </NavLink>
      </li>
    )
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden border-r border-[var(--nav-line)] bg-nav text-nav-ink">
      <div className={cn('relative flex items-center gap-2 pt-4 pb-3', collapsed ? 'flex-col px-2' : 'px-3')}>
        <div className={cn('flex min-w-0 items-center text-nav-strong', !collapsed && 'flex-1 px-1')}>{collapsed ? <Logo /> : <Brand />}</div>
        {onToggle && (
          <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="grid size-8 shrink-0 place-items-center rounded-lg text-nav-ink hover:bg-[var(--nav-hover)] hover:text-nav-strong">
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mx-3 mb-1 rounded-[var(--r-ctl)] border border-current/10 px-3 py-2 text-xs">
          <span className="opacity-75">Viewing as</span> <span className="font-semibold text-nav-strong">{roleLabel[me.role]}</span>
        </div>
      )}

      <nav aria-label="Main" className={cn('scroll-thin relative mt-2 flex-1 overflow-y-auto pb-6', collapsed ? 'px-2' : 'px-3')}>
        {groups.map((group) => (
          <div key={group.label} className="mt-3 first:mt-0">
            {collapsed ? (
              <div className="mx-2 mb-2 h-px bg-current opacity-10" />
            ) : collapsible ? (
              <button
                type="button"
                aria-expanded={isOpen(group.label)}
                onClick={() => setOpen((o) => ({ ...o, [group.label]: !isOpen(group.label) }))}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1 text-xs font-medium opacity-80 hover:opacity-100"
              >
                {group.label}
                <ChevronDown className={cn('size-3.5 transition-transform', !isOpen(group.label) && '-rotate-90')} />
              </button>
            ) : (
              <div className="mb-1 px-2.5 text-xs font-medium opacity-75">{group.label}</div>
            )}
            {isOpen(group.label) && <ul className="mt-0.5 space-y-0.5">{group.items.map(link)}</ul>}
          </div>
        ))}
      </nav>
    </div>
  )
}
