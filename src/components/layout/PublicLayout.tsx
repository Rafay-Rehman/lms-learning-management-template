import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Menu as MenuIcon, Moon, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { roleHome } from '@/services/permissions'
import { useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { Brand } from './Brand'
import { useDemoSwitcher } from './DemoSwitcher'

const hrefs = { courses: '/courses', categories: '/#categories', instructors: '/#instructors', faq: '/#faq', verify: '/verify' } as const

export function PublicLayout() {
  const { data, dark, setPrefs } = useStore()
  const me = useMe()
  const switcher = useDemoSwitcher()
  const navigate = useNavigate()
  const { pathname, hash } = useLocation()
  const [open, setOpen] = useState(false)
  const items = data.website.nav.filter((n) => n.visible)

  useEffect(() => {
    setOpen(false)
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  const links = (mobile: boolean) =>
    items.map((n) => (
      <NavLink key={n.id} to={hrefs[n.id]} className={({ isActive }) => cn('rounded-[var(--r-ctl)] px-3 py-2 text-sm font-medium transition-colors', isActive && !hrefs[n.id].includes('#') ? 'text-primary' : 'text-muted hover:text-ink', mobile && 'block')}>
        {n.label}
      </NavLink>
    ))

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <header className="glass glass-header sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="min-w-0 text-ink" aria-label={`${data.settings.name} home`}>
            <Brand subtle />
          </Link>
          <nav aria-label="Site" className="ml-4 hidden items-center gap-1 md:flex">{links(false)}</nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setPrefs({ mode: dark ? 'light' : 'dark' })} icon={dark ? <Sun /> : <Moon />} />
            <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => switcher()}>Demo accounts</Button>
            <Button variant="primary" className="hidden sm:inline-flex" onClick={() => navigate(roleHome[me.role])}>Open dashboard</Button>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)} icon={open ? <X /> : <MenuIcon />} />
          </div>
        </div>
        {open && (
          <nav aria-label="Site" className="border-t border-line px-4 py-3 md:hidden">
            {links(true)}
            <button className="block w-full rounded-[var(--r-ctl)] px-3 py-2 text-left text-sm font-medium text-muted hover:text-ink" onClick={() => switcher()}>Demo accounts</button>
            <button className="block w-full rounded-[var(--r-ctl)] px-3 py-2 text-left text-sm font-medium text-muted hover:text-ink" onClick={() => setPrefs({ mode: dark ? 'light' : 'dark' })}>{dark ? 'Light theme' : 'Dark theme'}</button>
            <Button variant="primary" className="mt-2 w-full justify-center" onClick={() => navigate(roleHome[me.role])}>Open dashboard</Button>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-sm text-muted">{data.website.footerBlurb}</p>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold">Learn</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link className="hover:text-ink" to="/courses">All courses</Link></li>
              {data.categories.slice(0, 4).map((c) => <li key={c.id}><Link className="hover:text-ink" to={`/courses?category=${c.id}`}>{c.name}</Link></li>)}
            </ul>
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold">Platform</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link className="hover:text-ink" to="/verify">Verify a certificate</Link></li>
              <li><Link className="hover:text-ink" to="/learn">Student dashboard</Link></li>
              <li><Link className="hover:text-ink" to="/teach">Instructor dashboard</Link></li>
              <li><Link className="hover:text-ink" to="/admin">Administration</Link></li>
              <li><a className="hover:text-ink" href={`mailto:${data.settings.supportEmail}`}>{data.settings.supportEmail}</a></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-line px-4 py-4 text-center text-xs text-faint">© {new Date().getFullYear()} {data.settings.name}. Demo template — all people and records are fictional.</p>
      </footer>
    </div>
  )
}
