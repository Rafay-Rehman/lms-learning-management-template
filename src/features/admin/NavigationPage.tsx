import { useState } from 'react'
import { ArrowDown, ArrowUp, Save, Undo2 } from 'lucide-react'
import type { WebsiteConfig } from '@/types'
import { navigation } from '@/app/navigation'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Input, Switch } from '@/components/ui/Field'
import { PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/state/store'

export default function NavigationPage() {
  const { data, actions } = useStore()
  const toast = useToast()
  const [w, setW] = useState<WebsiteConfig>(structuredClone(data.website))
  const [error, setError] = useState('')
  const dirty = JSON.stringify(w) !== JSON.stringify(data.website)
  const move = (i: number, d: number) => {
    const n = [...w.nav]
    const j = i + d
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    setW({ ...w, nav: n })
  }
  const optional = (['student', 'instructor'] as const).map((r) => ({ role: r, items: navigation[r].flatMap((g) => g.items).filter((i) => i.optional) }))
  const save = () => {
    const r = actions.saveWebsite(w)
    if (!r.ok) return setError(Object.values(r.errors)[0])
    setError('')
    toast('Menus saved')
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Navigation & Menu Settings"
        description="Rename, reorder and hide public menu items, and choose which optional pages appear in student and instructor sidebars."
        actions={<><Button icon={<Undo2 />} disabled={!dirty} onClick={() => setW(structuredClone(data.website))}>Discard</Button><Button variant="primary" icon={<Save />} disabled={!dirty} onClick={save}>Save menus</Button></>}
      />
      {error && <p className="mb-4 rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
      <div className="space-y-6">
        <Section title="Public site header">
          <ol className="space-y-2">
            {w.nav.map((n, i) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 rounded-[var(--r-ctl)] border border-line p-2">
                <span className="w-24 text-xs text-muted">{{ courses: 'Catalog', categories: 'Subjects', instructors: 'Instructors', faq: 'FAQ', verify: 'Verification' }[n.id]}</span>
                <Input aria-label={`Label for ${n.id}`} value={n.label} className="min-w-40 flex-1" maxLength={30} onChange={(e) => setW({ ...w, nav: w.nav.map((x) => (x.id === n.id ? { ...x, label: e.target.value } : x)) })} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={n.visible} onChange={(e) => setW({ ...w, nav: w.nav.map((x) => (x.id === n.id ? { ...x, visible: e.target.checked } : x)) })} />Visible</label>
                <Button size="icon-sm" variant="ghost" aria-label={`Move ${n.label} up`} disabled={!i} icon={<ArrowUp />} onClick={() => move(i, -1)} />
                <Button size="icon-sm" variant="ghost" aria-label={`Move ${n.label} down`} disabled={i === w.nav.length - 1} icon={<ArrowDown />} onClick={() => move(i, 1)} />
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-faint">Menu items link to fixed destinations; only their label, order and visibility change.</p>
        </Section>
        {optional.map(({ role, items }) => (
          <Section key={role} title={`${role === 'student' ? 'Student' : 'Instructor'} sidebar`} action={<Badge>Optional pages</Badge>}>
            <div className="divide-y divide-line">
              {items.map((it) => <Switch key={it.to} label={it.label} description={it.to} checked={!w.hiddenNav.includes(it.to)} onChange={(v) => setW({ ...w, hiddenNav: v ? w.hiddenNav.filter((x) => x !== it.to) : [...w.hiddenNav, it.to] })} />)}
            </div>
            <p className="mt-2 text-xs text-faint">Core pages (dashboard, courses, assessments, settings) always stay visible. Hidden pages still work if someone has the link.</p>
          </Section>
        ))}
        <Section title="Admin sidebar">
          <p className="text-sm text-muted">Academic levels you don’t use (years, terms, faculties, departments, subjects) can be hidden from the admin sidebar in Platform Settings → Academic structure.</p>
        </Section>
      </div>
    </div>
  )
}
