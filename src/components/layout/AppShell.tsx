import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import type { Role } from '@/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { roleLabel } from '@/services/permissions'
import { useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { useDemoSwitcher } from './DemoSwitcher'
import { SearchPalette } from './SearchPalette'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/**
 * Dashboard layout for one role. Visiting another role's area shows a
 * prompt to switch demo accounts. This client-side check only shapes the
 * demo experience — a real deployment must authorize every request on the server.
 */
export function AppShell({ role }: { role: Role }) {
  const { prefs, setPrefs, persisted, recovered, theme, themeDraft, setThemeDraft, data } = useStore()
  const me = useMe()
  const switcher = useDemoSwitcher()
  const { pathname } = useLocation()
  const draftPending = !!themeDraft && JSON.stringify(themeDraft) !== JSON.stringify(data.theme) && pathname !== '/admin/theme'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const collapsed = prefs.sidebarCollapsed ?? theme.sidebarCollapsed
  const toggle = () => setPrefs({ sidebarCollapsed: !collapsed })

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return void (e.preventDefault(), setSearchOpen(true))
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('dialog[open]')) return
      if (e.key === '/') (e.preventDefault(), setSearchOpen(true))
      else if (e.key === '[') toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-lg bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>

      <aside className={cn('no-print sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 lg:block', collapsed ? 'w-[68px]' : 'w-[264px]')}>
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Navigation" onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}>
          <div className="absolute inset-0 animate-fade bg-[rgb(10_12_30/0.5)]" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[284px] max-w-[85vw] animate-[slide_220ms_reverse] shadow-lg">
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setSearchOpen(true)} />
        {!persisted && <p className="no-print border-b border-warning/30 bg-warning/10 px-6 py-2 text-[13px] text-ink">Your browser isn’t letting this demo save. Changes will be lost when you close the tab.</p>}
        {draftPending && (
          <p className="no-print flex flex-wrap items-center gap-x-3 border-b border-warning/30 bg-warning/10 px-6 py-2 text-[13px] text-ink">
            You’re previewing unsaved theme changes.
            <Link to="/admin/theme" className="font-medium text-link hover:underline">Review and save</Link>
            <button className="font-medium text-link hover:underline" onClick={() => setThemeDraft(null)}>Discard</button>
          </p>
        )}
        {recovered && <p className="no-print border-b border-warning/30 bg-warning/10 px-6 py-2 text-[13px] text-ink">Saved demo data was from an older version or couldn’t be read, so the sample data was restored.</p>}
        <main id="main" className="mx-auto w-full max-w-[var(--content-max)] min-w-0 flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
          {me.role === role ? (
            <Outlet />
          ) : (
            <EmptyState
              icon={<ShieldAlert />}
              title={`This area is for ${roleLabel[role].toLowerCase()}s`}
              body={`You’re viewing the demo as ${me.name} (${roleLabel[me.role].toLowerCase()}). Switch to a ${roleLabel[role].toLowerCase()} account to continue. In production, the server must enforce access to every page and action.`}
              action={<Button variant="primary" onClick={() => switcher(role)}>Switch to a {roleLabel[role].toLowerCase()} account</Button>}
              className="py-24"
      heading
            />
          )}
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
