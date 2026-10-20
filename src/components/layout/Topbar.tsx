import { Link, useLocation, useNavigate } from 'react-router'
import { Bell, CheckCheck, ChevronRight, ExternalLink, LogOut, Menu as MenuIcon, Monitor, Moon, RotateCcw, Search, Settings, Sun, UserRound, UserRoundCog } from 'lucide-react'
import { navItemFor } from '@/app/navigation'
import { Avatar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Menu, Popover } from '@/components/ui/Menu'
import { useConfirm } from '@/components/ui/Overlay'
import { Kbd } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { NotificationList } from '@/features/notifications/NotificationList'
import { roleHome, roleLabel } from '@/services/permissions'
import { useLookup, useMe, useMyNotifications } from '@/state/selectors'
import { useStore } from '@/state/store'
import { useDemoSwitcher } from './DemoSwitcher'

/** Readable name for the record in the URL, for the last breadcrumb. */
function useCrumb(pathname: string) {
  const look = useLookup()
  const { data } = useStore()
  const parts = pathname.split('/')
  const id = parts[3]
  if (!id || id === 'new') return id === 'new' ? 'New' : undefined
  if (parts[2] === 'course' || parts[2] === 'courses') return look.course(id)?.title
  if (parts[2] === 'subjects') return look.subject(id)?.name
  if (parts[2] === 'users' || parts[2] === 'students') return look.user(id)?.name
  if (parts[2] === 'quizzes' || parts[2] === 'exams') return look.quiz(id)?.title
  if (parts[2] === 'assignments') return data.assignments.find((a) => a.id === id)?.title
  if (parts[2] === 'certificates') return data.certificates.find((c) => c.id === id)?.courseTitle
  return undefined
}

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { actions, prefs, setPrefs } = useStore()
  const me = useMe()
  const toast = useToast()
  const navigate = useNavigate()
  const switcher = useDemoSwitcher()
  const [confirm, confirmDialog] = useConfirm()
  const { pathname } = useLocation()
  const item = navItemFor(me.role, pathname)
  const crumb = useCrumb(pathname)
  const notes = useMyNotifications()
  const unread = notes.filter((n) => !n.read).length
  const base = roleHome[me.role]

  return (
    <header className="glass glass-header no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line px-4 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={onMenu} icon={<MenuIcon />} />

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <span className="hidden text-faint sm:inline">{item?.group}</span>
        {item && <ChevronRight className="hidden size-3.5 shrink-0 text-faint sm:inline" />}
        {crumb ? (
          <>
            <Link to={item?.to ?? base} className="hidden text-muted hover:text-ink sm:inline">{item?.label}</Link>
            <ChevronRight className="hidden size-3.5 shrink-0 text-faint sm:inline" />
            <span className="truncate font-medium text-ink">{crumb}</span>
          </>
        ) : (
          <span className="truncate font-medium text-ink">{item?.label ?? 'Not found'}</span>
        )}
      </nav>

      <button onClick={onSearch} className="hidden h-9 w-56 items-center gap-2 rounded-[var(--r-ctl)] border border-line bg-surface/70 px-3 text-sm text-faint shadow-sm hover:border-line-strong md:flex xl:w-72" aria-label="Search">
        <Search className="size-4" />
        <span className="flex-1 text-left">Search courses, people…</span>
        <Kbd>⌘K</Kbd>
      </button>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={onSearch} icon={<Search />} />

      <Menu
        trigger={(p) => <Button {...p} variant="ghost" size="icon" aria-label="Theme" icon={prefs.mode === 'dark' ? <Moon /> : prefs.mode === 'light' ? <Sun /> : <Monitor />} />}
        width="w-48"
        items={[
          { label: 'Light', icon: <Sun />, checked: prefs.mode === 'light', onSelect: () => setPrefs({ mode: 'light' }) },
          { label: 'Dark', icon: <Moon />, checked: prefs.mode === 'dark', onSelect: () => setPrefs({ mode: 'dark' }) },
          { label: 'Platform default', icon: <Monitor />, checked: prefs.mode === null, onSelect: () => setPrefs({ mode: null }) },
        ]}
      />

      <Popover
        label="Notifications"
        width="w-[380px]"
        trigger={(p) => (
          <button {...p} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative grid size-9 place-items-center rounded-[var(--r-ctl)] text-muted hover:bg-surface-3 hover:text-ink">
            <Bell className="size-[18px]" />
            {unread > 0 && <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-surface tabular">{unread}</span>}
          </button>
        )}
      >
        {(close) => (
          <div>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-sans text-sm font-semibold">Notifications</h2>
              <Button size="sm" variant="ghost" icon={<CheckCheck />} disabled={!unread} onClick={() => actions.readNotifications('all')}>Mark all read</Button>
            </div>
            <div className="scroll-thin max-h-[60vh] overflow-y-auto p-1.5">
              <NotificationList items={notes.slice(0, 7)} compact onOpen={close} />
            </div>
            <Link to={`${base}/notifications`} onClick={close} className="block border-t border-line px-4 py-2.5 text-center text-[13px] font-medium text-link hover:bg-surface-2">
              View all notifications
            </Link>
          </div>
        )}
      </Popover>

      <Menu
        width="w-64"
        trigger={(p) => (
          <button {...p} aria-label="Account menu" className="ml-1 rounded-full">
            <Avatar user={me} />
          </button>
        )}
        header={
          <div className="border-b border-line px-3 py-2.5">
            <div className="truncate text-sm font-medium text-ink">{me.name}</div>
            <div className="truncate text-xs text-muted">{roleLabel[me.role]} · {me.email}</div>
          </div>
        }
        items={[
          ...(me.role !== 'admin' ? [{ label: 'Profile', icon: <UserRound />, onSelect: () => navigate(`${base}/profile`) }] : []),
          { label: 'Settings', icon: <Settings />, onSelect: () => navigate(me.role === 'admin' ? '/admin/settings' : `${base}/settings`) },
          { label: 'Switch demo account…', icon: <UserRoundCog />, onSelect: () => switcher() },
          { label: 'View public site', icon: <ExternalLink />, onSelect: () => navigate('/') },
          'divider',
          {
            label: 'Reset demo data…',
            icon: <RotateCcw />,
            onSelect: () =>
              confirm({
                title: 'Reset demo data?',
                body: 'All changes you’ve made in this browser — courses, enrollments, progress, grades, settings and theme — are replaced with the original sample data.',
                confirmLabel: 'Reset demo data',
                onConfirm: () => {
                  actions.reset()
                  setPrefs({ mode: null })
                  navigate('/learn')
                  toast('Demo data restored')
                },
              }),
          },
          { label: 'Sign out (demo)', icon: <LogOut />, onSelect: () => (navigate('/'), toast('This demo has no accounts. Connect your identity provider to enable sign-out.', { tone: 'info' })) },
        ]}
      />
      {confirmDialog}
    </header>
  )
}
