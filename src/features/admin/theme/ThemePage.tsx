import { useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, Monitor, Moon, RotateCcw, Save, Sun, Undo2 } from 'lucide-react'
import type { DashboardWidget, Palette, Theme } from '@/types'
import { Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { useConfirm } from '@/components/ui/Overlay'
import { PageHeader, Section, Segmented, Tabs } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { readImage } from '@/lib/files'
import { COLOR_FIELDS, contrastRatio, DEFAULT_THEME, FONTS, onColor, PRESETS } from '@/services/theme'
import { useStore } from '@/state/store'
import { ColorField, useRecentColors } from './ColorField'
import { ThemePreview } from './ThemePreview'

type Tab = 'presets' | 'brand' | 'colors' | 'appearance' | 'layout'
type Brand = { name: string; tagline: string; description: string; logo: string | null; favicon: string | null }
const widgetLabels: Record<DashboardWidget, string> = { activity: 'Learning activity chart', tasks: 'Upcoming tasks', recommended: 'Recommended courses', achievements: 'Recent achievements', goal: 'Weekly learning goal' }
const defaultBrand: Brand = { name: 'Northfield Institute', tagline: 'Learning portal', description: 'Courses and programmes from Northfield Institute, open to students, staff and lifelong learners.', logo: null, favicon: null }

function Contrast({ fg, bg, label, min = 4.5 }: { fg: string; bg: string; label: string; min?: number }) {
  const r = contrastRatio(fg, bg)
  const ok = r >= min
  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <span className="grid h-7 w-10 shrink-0 place-items-center rounded-md text-xs font-bold" style={{ background: bg, color: fg }}>Aa</span>
      <span className="flex-1">{label}</span>
      <span className="tabular text-muted">{r.toFixed(1)}:1</span>
      <Badge color={ok ? 'var(--success)' : 'var(--danger)'}>{ok ? (r >= 7 ? 'AAA' : 'AA') : 'Too low'}</Badge>
    </li>
  )
}

export function contrastProblems(t: Theme): string[] {
  const out: string[] = []
  for (const [mode, p] of [['light', t.light], ['dark', t.dark]] as const) {
    if (contrastRatio(p.text, p.background) < 4.5) out.push(`${mode} mode: text on the page background is below 4.5:1`)
    if (contrastRatio(p.text, p.surface) < 4.5) out.push(`${mode} mode: text on cards is below 4.5:1`)
    if (contrastRatio(p.sidebarText, p.sidebar) < 3) out.push(`${mode} mode: sidebar text is below 3:1`)
  }
  return out
}

export default function ThemePage() {
  const { data, actions, themeDraft, setThemeDraft, liveTheme, setLiveTheme, applyDraft, dark: appDark } = useStore()
  const toast = useToast()
  const [confirm, dialog] = useConfirm()
  const { recent, push } = useRecentColors()
  const [tab, setTab] = useState<Tab>('presets')
  const [variant, setVariant] = useState<'light' | 'dark'>(appDark ? 'dark' : 'light')
  const [view, setView] = useState<'components' | 'landing'>('components')
  const saved = data.theme
  const savedBrand: Brand = { name: data.settings.name, tagline: data.settings.tagline, description: data.settings.description, logo: data.settings.logo, favicon: data.settings.favicon }
  const [brand, setBrand] = useState<Brand>(savedBrand)
  useEffect(() => {
    if (!themeDraft) setThemeDraft(structuredClone(saved))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const t = themeDraft ?? saved
  const themeDirty = JSON.stringify(t) !== JSON.stringify(saved)
  const brandDirty = JSON.stringify(brand) !== JSON.stringify(savedBrand)
  const dirty = themeDirty || brandDirty
  // Leaving the page with nothing unsaved ends the draft; unsaved drafts stay (and a banner says so).
  const dirtyRef = useRef(themeDirty)
  dirtyRef.current = themeDirty
  useEffect(() => () => void (dirtyRef.current || setThemeDraft(null)), []) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<Theme>) => setThemeDraft({ ...t, ...p, presetId: p.presetId ?? (p.light || p.dark ? 'custom' : t.presetId) })
  const setColor = (k: keyof Palette, v: string) => set({ [variant]: { ...t[variant], [k]: v } } as Partial<Theme>)
  const base = PRESETS.find((p) => p.id === t.presetId)?.theme ?? DEFAULT_THEME
  const pal = t[variant]
  const problems = contrastProblems(t)

  const saveAll = () => {
    if (problems.length) return toast(`Fix contrast first — ${problems[0]}`, { tone: 'error' })
    if (!brand.name.trim()) return toast('Enter a platform name', { tone: 'error' })
    if (brandDirty) {
      const r = actions.updateSettings({ ...brand, name: brand.name.trim() })
      if (!r.ok) return toast(Object.values(r.errors)[0], { tone: 'error' })
    }
    const r = actions.saveTheme(t)
    if (!r.ok) return toast(Object.values(r.errors)[0], { tone: 'error' })
    toast('Theme saved — it now applies to every page, and persists after refresh')
  }
  const discard = () => {
    setThemeDraft(structuredClone(saved))
    setBrand(savedBrand)
    toast('Unsaved changes discarded', { tone: 'info' })
  }
  const reset = () =>
    confirm({
      title: 'Reset theme and branding to defaults?',
      body: 'The draft returns to the Modern Indigo preset and the default name and logo. Nothing is saved until you choose Save theme.',
      confirmLabel: 'Reset to defaults',
      tone: 'primary',
      onConfirm: () => (setThemeDraft(structuredClone(DEFAULT_THEME)), setBrand(defaultBrand), toast('Defaults loaded — save to keep them', { tone: 'info' })),
    })

  return (
    <div>
      <PageHeader
        title="Theme & Branding"
        description={<span className="flex flex-wrap items-center gap-2">Change how the whole LMS looks — public site, student, instructor and admin pages. {dirty ? <Badge color="var(--warning)">Unsaved changes</Badge> : <Badge color="var(--success)">Saved</Badge>}</span>}
        actions={
          <>
            <Button icon={<RotateCcw />} onClick={reset}>Reset to defaults</Button>
            <Button icon={<Undo2 />} disabled={!dirty} onClick={discard}>Discard changes</Button>
            {!liveTheme && <Button onClick={() => (applyDraft(), toast('Applied to the app for this session — save to keep it', { tone: 'info' }))}>Apply changes</Button>}
            <Button variant="primary" icon={<Save />} disabled={!dirty} onClick={saveAll}>Save theme</Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[var(--r-ctl)] border border-line bg-surface px-4 py-2">
        <div className="min-w-64 flex-1"><Switch label="Live update the whole app" description="Off: only the preview changes until you press Apply changes." checked={liveTheme} onChange={setLiveTheme} /></div>
        <p className="text-xs text-muted">Stored in this browser for the demo. In production, organization-wide themes must be saved and authorized on the server.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'presets', label: 'Presets' }, { value: 'brand', label: 'Brand' }, { value: 'colors', label: 'Colors' }, { value: 'appearance', label: 'Appearance' }, { value: 'layout', label: 'Layout' }]} />
          <div className="space-y-5 pt-5">
            {tab === 'presets' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {PRESETS.map((p) => {
                  const active = t.presetId === p.id
                  return (
                    <button key={p.id} type="button" aria-pressed={active} onClick={() => (setThemeDraft({ ...structuredClone(p.theme), widgets: t.widgets }), toast(`${p.name} applied — customize it in the other tabs`, { tone: 'info' }))} className={cn('panel overflow-hidden text-left transition-shadow hover:shadow-md', active && 'ring-2 ring-primary')}>
                      <div className="flex h-16">
                        <span className="w-1/4" style={{ background: p.theme.light.sidebar }} />
                        <span className="flex flex-1 items-center gap-1.5 px-3" style={{ background: p.theme.light.background }}>
                          {(['primary', 'secondary', 'accent'] as const).map((k) => <span key={k} className="size-6 rounded-full" style={{ background: p.theme.light[k] }} />)}
                        </span>
                        <span className="flex w-1/4 items-center justify-center" style={{ background: p.theme.dark.background }}><span className="size-5 rounded-full" style={{ background: p.theme.dark.primary }} /></span>
                      </div>
                      <div className="p-3">
                        <p className="flex items-center gap-2 font-medium">{p.name}{active && <Check className="size-4 text-primary" />}</p>
                        <p className="text-xs text-muted">{p.description}</p>
                      </div>
                    </button>
                  )
                })}
                {t.presetId === 'custom' && <p className="text-sm text-muted sm:col-span-2">You’re using a customized palette. Choosing a preset replaces it.</p>}
              </div>
            )}

            {tab === 'brand' && (
              <Section title="Brand identity">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Platform name" required>{(p) => <Input {...p} value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} />}</Field>
                  <Field label="Tagline">{(p) => <Input {...p} value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} />}</Field>
                  <Field label="Brand description" className="sm:col-span-2">{(p) => <Textarea {...p} value={brand.description} onChange={(e) => setBrand({ ...brand, description: e.target.value })} />}</Field>
                  {(['logo', 'favicon'] as const).map((k) => (
                    <div key={k}>
                      <p className="text-[13px] font-medium">{k === 'logo' ? 'Logo' : 'Favicon'}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <img src={brand[k] ?? (k === 'logo' ? '/assets/logo.svg' : '/favicon.svg')} alt="" className="size-12 rounded-[var(--r-ctl)] border border-line object-contain p-1" />
                        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--r-btn)] border border-line px-2.5 text-[13px] font-medium hover:bg-surface-2">
                          <ImagePlus className="size-4" />Upload
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={async (e) => { const r = await readImage(e.target.files?.[0], true); e.target.value = ''; 'url' in r ? setBrand({ ...brand, [k]: r.url }) : toast(r.error, { tone: 'error' }) }} />
                        </label>
                        {brand[k] && <Button size="sm" variant="ghost" onClick={() => setBrand({ ...brand, [k]: null })}>Use default</Button>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-faint">Uploads are kept as data URLs in this browser (SVG, PNG, JPEG or WebP under 600 KB) and only ever rendered as images. A production app should upload them to file storage.</p>
                <Button className="mt-3" size="sm" icon={<RotateCcw />} onClick={() => setBrand(defaultBrand)}>Restore default brand identity</Button>
              </Section>
            )}

            {tab === 'colors' && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Segmented label="Editing palette" value={variant} onChange={setVariant} options={[{ value: 'light', label: 'Light palette', icon: <Sun /> }, { value: 'dark', label: 'Dark palette', icon: <Moon /> }]} />
                  <span className="text-xs text-muted">The preview follows the palette you’re editing.</span>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-medium">Quick primary colors</p>
                  <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p.id} type="button" title={p.name} aria-label={`Use ${p.name} primary`} onClick={() => (setColor('primary', p.theme[variant].primary), push(p.theme[variant].primary))} className="size-7 rounded-full border border-line" style={{ background: p.theme[variant].primary }} />)}</div>
                </div>
                {(['Brand', 'Status', 'Surfaces', 'Sidebar'] as const).map((g) => (
                  <Section key={g} title={g === 'Surfaces' ? 'Backgrounds & text' : g}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {COLOR_FIELDS.filter((f) => f.group === g).map((f) => (
                        <div key={f.key} onBlur={() => push(pal[f.key])}>
                          <ColorField label={f.label} value={pal[f.key]} recent={recent} onChange={(v) => setColor(f.key, v)} onReset={pal[f.key] !== base[variant][f.key] ? () => setColor(f.key, base[variant][f.key]) : undefined} />
                        </div>
                      ))}
                    </div>
                  </Section>
                ))}
                <Section title="Contrast check">
                  <ul>
                    <Contrast fg={pal.text} bg={pal.background} label="Text on page background" />
                    <Contrast fg={pal.text} bg={pal.surface} label="Text on cards" />
                    <Contrast fg={pal.muted} bg={pal.surface} label="Secondary text on cards" />
                    <Contrast fg={onColor(pal.primary)} bg={pal.primary} label="Primary button text" min={3} />
                    <Contrast fg={pal.link} bg={pal.surface} label="Links on cards" />
                    <Contrast fg={pal.sidebarText} bg={pal.sidebar} label="Sidebar text" min={3} />
                  </ul>
                  <p className="mt-2 text-xs text-faint">Button text color is chosen automatically for the best contrast. Saving is blocked if body or sidebar text becomes unreadable.</p>
                </Section>
              </>
            )}

            {tab === 'appearance' && (
              <Section title="Appearance">
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-[13px] font-medium">Default color mode</p>
                    <Segmented label="Default color mode" value={t.mode} onChange={(v) => set({ mode: v })} options={[{ value: 'light', label: 'Light', icon: <Sun /> }, { value: 'dark', label: 'Dark', icon: <Moon /> }, { value: 'system', label: 'Match system', icon: <Monitor /> }]} />
                    <p className="mt-1 text-xs text-faint">People can still pick their own mode in their settings.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Body font">{(p) => <Select {...p} value={t.font} onChange={(e) => set({ font: e.target.value })}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>}</Field>
                    <Field label="Heading font">{(p) => <Select {...p} value={t.headingFont} onChange={(e) => set({ headingFont: e.target.value })}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>}</Field>
                    <Field label={`Text size (${Math.round(t.fontScale * 100)}%)`}>{(p) => <input {...p} type="range" min={0.9} max={1.15} step={0.05} value={t.fontScale} onChange={(e) => set({ fontScale: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />}</Field>
                    <Field label={`Corner radius (${t.radius}px)`}>{(p) => <input {...p} type="range" min={0} max={24} value={t.radius} onChange={(e) => set({ radius: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />}</Field>
                    <Field label="Density">{(p) => <Select {...p} value={t.density} onChange={(e) => set({ density: e.target.value as Theme['density'] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></Select>}</Field>
                    <Field label="Button shape">{(p) => <Select {...p} value={t.buttonShape} onChange={(e) => set({ buttonShape: e.target.value as Theme['buttonShape'] })}><option value="rounded">Rounded</option><option value="pill">Pill</option><option value="square">Square</option></Select>}</Field>
                    <Field label="Card style">{(p) => <Select {...p} value={t.cardStyle} onChange={(e) => set({ cardStyle: e.target.value as Theme['cardStyle'] })}><option value="bordered">Bordered</option><option value="elevated">Elevated (shadow, no border)</option><option value="flat">Flat (border, no shadow)</option></Select>}</Field>
                    <Field label="Shadow intensity">{(p) => <Select {...p} value={t.shadow} onChange={(e) => set({ shadow: e.target.value as Theme['shadow'] })}><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></Select>}</Field>
                  </div>
                  <Switch label="Reduce motion for everyone" description="Turns off animations platform-wide. People who ask their device for reduced motion always get it." checked={t.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
                </div>
              </Section>
            )}

            {tab === 'layout' && (
              <>
                <Section title="Layout">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Sidebar style">{(p) => <Select {...p} value={t.sidebarStyle} onChange={(e) => set({ sidebarStyle: e.target.value as Theme['sidebarStyle'] })}><option value="brand">Brand colors (from Sidebar palette)</option><option value="dark">Neutral dark</option><option value="light">Light, matches cards</option></Select>}</Field>
                    <Field label="Header">{(p) => <Select {...p} value={t.headerStyle} onChange={(e) => set({ headerStyle: e.target.value as Theme['headerStyle'] })}><option value="glass">Translucent (frosted)</option><option value="solid">Solid</option></Select>}</Field>
                    <Field label="Content width">{(p) => <Select {...p} value={t.contentWidth} onChange={(e) => set({ contentWidth: e.target.value as Theme['contentWidth'] })}><option value="standard">Standard (1240px)</option><option value="wide">Wide (1520px)</option><option value="full">Full width</option></Select>}</Field>
                    <Field label="Course cards">{(p) => <Select {...p} value={t.courseCard} onChange={(e) => set({ courseCard: e.target.value as Theme['courseCard'] })}><option value="detailed">Detailed (with summary)</option><option value="compact">Compact</option></Select>}</Field>
                  </div>
                  <Switch label="Start with the sidebar collapsed" description="Default for people who haven’t chosen; anyone can toggle it." checked={t.sidebarCollapsed} onChange={(v) => set({ sidebarCollapsed: v })} />
                </Section>
                <Section title="Student dashboard widgets">
                  <div className="divide-y divide-line">
                    {(Object.keys(widgetLabels) as DashboardWidget[]).map((w) => <Switch key={w} label={widgetLabels[w]} checked={t.widgets[w]} onChange={(v) => set({ widgets: { ...t.widgets, [w]: v } })} />)}
                  </div>
                  <p className="mt-2 text-xs text-faint">Landing-page sections are managed in Website Appearance.</p>
                </Section>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="flex-1 font-sans text-sm font-semibold">Live preview</h2>
            <Segmented size="sm" label="Preview view" value={view} onChange={setView} options={[{ value: 'components', label: 'Components' }, { value: 'landing', label: 'Landing page' }]} />
            <Segmented size="sm" label="Preview mode" value={variant} onChange={setVariant} options={[{ value: 'light', label: 'Preview light', icon: <Sun /> }, { value: 'dark', label: 'Preview dark', icon: <Moon /> }]} />
          </div>
          <ThemePreview theme={t} dark={variant === 'dark'} view={view} logo={brand.logo} name={brand.name || 'Platform'} />
          {problems.length > 0 && <ul className="mt-3 space-y-1 text-sm text-danger" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      </div>
      {dialog}
    </div>
  )
}
