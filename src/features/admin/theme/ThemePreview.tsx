import type { CSSProperties } from 'react'
import { Bell, BookOpen, LayoutDashboard, Search, Settings, Users } from 'lucide-react'
import type { Theme } from '@/types'
import { CourseCard, useCatalog } from '@/components/courses/CourseCard'
import { Avatar, Badge, Progress, ProgressRing } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input, Select, Switch } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/Stat'
import { Landing } from '@/features/public/LandingPage'
import { cn } from '@/lib/cn'
import { FONTS, themeVars } from '@/services/theme'
import { useStore } from '@/state/store'

/** CSS variables for a scoped preview (custom properties keep their names; others become camelCase). */
export function scopeStyle(theme: Theme, dark: boolean): CSSProperties {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(themeVars(theme, dark))) out[k.startsWith('--') ? k : k.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v
  return { ...out, background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font-body)' } as CSSProperties
}

function Components({ theme, logo, name }: { theme: Theme; logo: string | null; name: string }) {
  const [entry] = useCatalog()
  return (
    <div className="flex min-h-[560px] overflow-hidden rounded-[var(--radius)] border border-line">
      <aside className="hidden w-44 shrink-0 flex-col gap-1 border-r border-[var(--nav-line)] bg-nav p-3 text-nav-ink sm:flex">
        <div className="mb-3 flex items-center gap-2 text-nav-strong"><img src={logo ?? '/assets/logo.svg'} alt="" className="size-7 rounded-md object-contain" /><span className="truncate font-display text-sm font-semibold">{name}</span></div>
        {[[LayoutDashboard, 'Dashboard', true], [BookOpen, 'Courses', false], [Users, 'Students', false], [Settings, 'Settings', false]].map(([I, l, a]) => {
          const Icon = I as typeof BookOpen
          return <span key={l as string} className={cn('relative flex items-center gap-2 rounded-[var(--r-ctl)] px-2 py-1.5 text-[13px] font-medium', a ? 'bg-[var(--nav-active)] text-nav-strong before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-highlight' : '')}><Icon className="size-4" />{l as string}{l === 'Students' && <span className="ml-auto rounded-full bg-highlight px-1.5 text-[10px] font-semibold text-[#1a1404]">3</span>}</span>
        })}
      </aside>
      <div className="min-w-0 flex-1">
        <div className={cn('flex h-12 items-center gap-2 border-b border-line px-4', theme.headerStyle === 'glass' ? 'glass' : 'bg-surface')}>
          <span className="flex-1 text-sm font-medium">Dashboard</span>
          <span className="hidden h-8 w-40 items-center gap-2 rounded-[var(--r-ctl)] border border-line bg-surface px-2 text-xs text-faint sm:flex"><Search className="size-3.5" />Search…</span>
          <span className="relative"><Bell className="size-4 text-muted" /><span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-semibold text-white">2</span></span>
          <Avatar name="Maya Patel" color="var(--secondary)" size="sm" />
        </div>
        <div className="space-y-4 p-4">
          <h3 className="text-xl font-semibold">Heading in {FONTS.find((f) => f.id === theme.headingFont)?.label}</h3>
          <p className="text-sm text-muted">Body text and <a className="link" href="#preview" onClick={(e) => e.preventDefault()}>a link</a> in the current palette.</p>
          <div className="flex flex-wrap gap-2"><Button variant="primary">Primary</Button><Button>Secondary</Button><Button variant="subtle">Subtle</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button></div>
          <div className="flex flex-wrap gap-2"><Badge color="var(--success)">Completed</Badge><Badge color="var(--warning)">Due soon</Badge><Badge color="var(--danger)">Overdue</Badge><Badge color="var(--primary)">Active</Badge><Badge color="var(--secondary)">Submitted</Badge></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Learning time" value="24h 51m" hint="This month" />
            <div className="panel flex items-center gap-4 p-4"><ProgressRing value={65} label="Preview progress" /><div className="flex-1"><p className="text-sm font-medium">Weekly goal</p><Progress value={65} label="Preview bar" className="mt-2" /></div></div>
          </div>
          <Segmented label="Preview tabs" value="a" onChange={() => {}} options={[{ value: 'a', label: 'Overview' }, { value: 'b', label: 'Lessons' }, { value: 'c', label: 'Q&A' }]} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Text input" aria-label="Preview input" />
            <Select aria-label="Preview select" defaultValue="b"><option value="b">Select menu</option></Select>
            <Checkbox label="Checkbox" checked onChange={() => {}} />
            <Switch label="Switch" checked onChange={() => {}} />
          </div>
          <div className="panel overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-faint"><th className="px-3 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Progress</th><th className="px-3 py-2 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-line">{[['Sofia García', 82, 'Active'], ['Kwame Mensah', 100, 'Completed']].map(([n, p, s]) => <tr key={n as string}><td className="px-3 py-2">{n}</td><td className="px-3 py-2"><Progress value={p as number} label="Row progress" /></td><td className="px-3 py-2"><Badge color={s === 'Active' ? 'var(--primary)' : 'var(--success)'}>{s}</Badge></td></tr>)}</tbody>
            </table>
          </div>
          {entry && <div className="max-w-xs"><CourseCard entry={entry} to="#preview" /></div>}
        </div>
      </div>
    </div>
  )
}

export function ThemePreview({ theme, dark, view, logo, name }: { theme: Theme; dark: boolean; view: 'components' | 'landing'; logo: string | null; name: string }) {
  const { data } = useStore()
  return (
    <div className={cn('theme-scope overflow-hidden rounded-[var(--radius)] border border-line', dark ? 'dark' : 'light')} style={scopeStyle(theme, dark)} data-header={theme.headerStyle} id="preview">
      {view === 'components' ? (
        <div className="p-3"><Components theme={theme} logo={logo} name={name} /></div>
      ) : (
        <div className="pointer-events-none h-[640px] overflow-hidden" aria-hidden>
          <div className="origin-top-left scale-[0.5]" style={{ width: '200%' }}><Landing w={data.website} /></div>
        </div>
      )}
    </div>
  )
}
