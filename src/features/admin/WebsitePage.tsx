import { useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react'
import type { LandingSectionId, WebsiteConfig } from '@/types'
import { Badge } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { useConfirm } from '@/components/ui/Overlay'
import { PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { defaultWebsite } from '@/data/seed'
import { Landing } from '@/features/public/LandingPage'
import { useStore } from '@/state/store'

export const sectionLabels: Record<LandingSectionId, string> = { featured: 'Featured courses', categories: 'Course categories', benefits: 'Benefits', instructors: 'Instructor showcase', stats: 'Learning statistics', testimonials: 'Testimonials', faq: 'FAQ', cta: 'Closing call to action' }
const uid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 6)}`

/** Constrained editor for the public landing page: predefined sections and fields, no free-form page builder. */
export default function WebsitePage() {
  const { data, actions } = useStore()
  const toast = useToast()
  const [confirm, dialog] = useConfirm()
  const [w, setW] = useState<WebsiteConfig>(structuredClone(data.website))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dirty = JSON.stringify(w) !== JSON.stringify(data.website)
  const set = (p: Partial<WebsiteConfig>) => setW({ ...w, ...p })
  const move = (i: number, d: number) => {
    const s = [...w.sections]
    const j = i + d
    if (j < 0 || j >= s.length) return
    ;[s[i], s[j]] = [s[j], s[i]]
    set({ sections: s })
  }
  const published = data.courses.filter((c) => c.status === 'published')
  const save = () => {
    const r = actions.saveWebsite(w)
    if (!r.ok) return setErrors(r.errors), toast(Object.values(r.errors)[0], { tone: 'error' })
    setErrors({})
    toast('Website saved — the public landing page is updated')
  }
  return (
    <div>
      <PageHeader
        title="Website Appearance"
        description={<span className="flex flex-wrap items-center gap-2">Content and layout of the public landing page. {dirty ? <Badge color="var(--warning)">Unsaved changes — preview only</Badge> : <Badge color="var(--success)">Live</Badge>}</span>}
        actions={
          <>
            <ButtonLink to="/" target="_blank" icon={<ExternalLink />}>View live page</ButtonLink>
            <Button icon={<RotateCcw />} onClick={() => confirm({ title: 'Load the default website content?', body: 'Headline, sections, testimonials, FAQ and menu go back to the template defaults. Nothing is saved until you press Save.', confirmLabel: 'Load defaults', tone: 'primary', onConfirm: () => setW(defaultWebsite()) })}>Defaults</Button>
            <Button icon={<Undo2 />} disabled={!dirty} onClick={() => (setW(structuredClone(data.website)), setErrors({}))}>Discard</Button>
            <Button variant="primary" icon={<Save />} disabled={!dirty} onClick={save}>Save</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Section title="Hero">
            <div className="grid gap-4">
              <Field label="Headline" required error={errors.headline} hint={`${w.headline.length}/120`}>{(p) => <Input {...p} value={w.headline} onChange={(e) => set({ headline: e.target.value })} maxLength={120} />}</Field>
              <Field label="Subheading">{(p) => <Textarea {...p} value={w.subheading} onChange={(e) => set({ subheading: e.target.value })} className="min-h-16" />}</Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Search button text" required error={errors.ctaText}>{(p) => <Input {...p} value={w.ctaText} onChange={(e) => set({ ctaText: e.target.value })} maxLength={30} />}</Field>
                <Field label="Hero visual">{(p) => <Select {...p} value={w.heroVisual} onChange={(e) => set({ heroVisual: e.target.value as WebsiteConfig['heroVisual'] })}><option value="syllabus">Course syllabus card</option><option value="pattern">Brand color with pattern</option><option value="plain">Plain, centered</option></Select>}</Field>
              </div>
            </div>
          </Section>
          <Section title="Sections" action={<span className="text-xs text-faint">Show, hide and reorder</span>}>
            <ol className="divide-y divide-line">
              {w.sections.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2 py-1.5">
                  <span className="w-5 text-xs text-faint tabular">{i + 1}</span>
                  <span className="flex-1"><Switch label={sectionLabels[s.id]} checked={s.visible} onChange={(v) => set({ sections: w.sections.map((x) => (x.id === s.id ? { ...x, visible: v } : x)) })} /></span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Move ${sectionLabels[s.id]} up`} disabled={i === 0} icon={<ArrowUp />} onClick={() => move(i, -1)} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Move ${sectionLabels[s.id]} down`} disabled={i === w.sections.length - 1} icon={<ArrowDown />} onClick={() => move(i, 1)} />
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Featured courses" action={<span className="text-xs text-faint">{w.featuredCourseIds.length} of 4</span>}>
            <div className="grid gap-2 sm:grid-cols-2">
              {published.map((c) => <Checkbox key={c.id} label={c.title} checked={w.featuredCourseIds.includes(c.id)} onChange={(v) => (v && w.featuredCourseIds.length >= 4 ? toast('Feature up to 4 courses', { tone: 'error' }) : set({ featuredCourseIds: v ? [...w.featuredCourseIds, c.id] : w.featuredCourseIds.filter((x) => x !== c.id) }))} />)}
            </div>
          </Section>
          <Section title="Visible categories">
            <div className="grid gap-2 sm:grid-cols-2">{data.categories.map((c) => <Checkbox key={c.id} label={c.name} checked={w.visibleCategoryIds.includes(c.id)} onChange={(v) => set({ visibleCategoryIds: v ? [...w.visibleCategoryIds, c.id] : w.visibleCategoryIds.filter((x) => x !== c.id) })} />)}</div>
          </Section>
          <Section title="Testimonials" action={<Button size="sm" variant="ghost" icon={<Plus />} onClick={() => set({ testimonials: [...w.testimonials, { id: uid('tm'), name: '', role: '', quote: '' }] })}>Add</Button>}>
            {errors.testimonials && <p className="mb-2 text-sm text-danger" role="alert">{errors.testimonials}</p>}
            <ul className="space-y-4">
              {w.testimonials.map((t, i) => (
                <li key={t.id} className="grid gap-2 rounded-[var(--r-ctl)] border border-line p-3 sm:grid-cols-2">
                  <Input aria-label={`Testimonial ${i + 1} name`} placeholder="Name" value={t.name} onChange={(e) => set({ testimonials: w.testimonials.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)) })} />
                  <div className="flex gap-2"><Input aria-label={`Testimonial ${i + 1} role`} placeholder="Role or context" value={t.role} onChange={(e) => set({ testimonials: w.testimonials.map((x) => (x.id === t.id ? { ...x, role: e.target.value } : x)) })} /><Button size="icon" variant="ghost" aria-label={`Remove testimonial ${i + 1}`} icon={<Trash2 />} onClick={() => set({ testimonials: w.testimonials.filter((x) => x.id !== t.id) })} /></div>
                  <Textarea aria-label={`Testimonial ${i + 1} quote`} placeholder="Quote" value={t.quote} className="min-h-16 sm:col-span-2" onChange={(e) => set({ testimonials: w.testimonials.map((x) => (x.id === t.id ? { ...x, quote: e.target.value } : x)) })} />
                </li>
              ))}
            </ul>
          </Section>
          <Section title="FAQ" action={<Button size="sm" variant="ghost" icon={<Plus />} onClick={() => set({ faq: [...w.faq, { id: uid('fq'), q: '', a: '' }] })}>Add question</Button>}>
            {errors.faq && <p className="mb-2 text-sm text-danger" role="alert">{errors.faq}</p>}
            <ul className="space-y-3">
              {w.faq.map((f, i) => (
                <li key={f.id} className="space-y-2 rounded-[var(--r-ctl)] border border-line p-3">
                  <div className="flex gap-2">
                    <Input aria-label={`Question ${i + 1}`} placeholder="Question" value={f.q} onChange={(e) => set({ faq: w.faq.map((x) => (x.id === f.id ? { ...x, q: e.target.value } : x)) })} />
                    <Button size="icon" variant="ghost" aria-label={`Move question ${i + 1} up`} disabled={!i} icon={<ArrowUp />} onClick={() => { const a = [...w.faq]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ faq: a }) }} />
                    <Button size="icon" variant="ghost" aria-label={`Remove question ${i + 1}`} icon={<Trash2 />} onClick={() => set({ faq: w.faq.filter((x) => x.id !== f.id) })} />
                  </div>
                  <Textarea aria-label={`Answer ${i + 1}`} placeholder="Answer" value={f.a} className="min-h-14" onChange={(e) => set({ faq: w.faq.map((x) => (x.id === f.id ? { ...x, a: e.target.value } : x)) })} />
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Footer">
            <Field label="Footer text">{(p) => <Textarea {...p} value={w.footerBlurb} onChange={(e) => set({ footerBlurb: e.target.value })} />}</Field>
            <p className="mt-2 text-xs text-faint">Logo and platform name come from Theme & Branding; menu labels from Navigation & Menus.</p>
          </Section>
        </div>
        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <p className="mb-2 text-sm font-semibold">Preview {dirty && <span className="font-normal text-warning">(unsaved)</span>}</p>
          <div className="h-[78vh] overflow-y-auto rounded-[var(--radius)] border border-line bg-bg">
            <div inert className="pointer-events-none origin-top-left scale-[0.55]" style={{ width: `${100 / 0.55}%` }}><Landing w={w} /></div>
          </div>
        </div>
      </div>
      {dialog}
    </div>
  )
}
