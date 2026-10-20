import { useState } from 'react'
import { Link } from 'react-router'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import type { User } from '@/types'
import { Avatar, Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { readImage } from '@/lib/files'
import { courseStatusMeta } from '@/services/courses'
import { useMe } from '@/state/selectors'
import { useStore } from '@/state/store'

export const timezones = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone')
  } catch {
    return ['UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Tokyo', 'Africa/Lagos', 'Australia/Sydney']
  }
})()

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export default function ProfilePage() {
  const { data, actions } = useStore()
  const me = useMe()
  const toast = useToast()
  const [u, setU] = useState<User>(me)
  const [interests, setInterests] = useState((me.role === 'instructor' ? me.expertise : me.interests).join(', '))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const teaching = data.courses.filter((c) => c.instructorId === me.id)
  const set = (patch: Partial<User>) => setU((x) => ({ ...x, ...patch }))

  const save = () => {
    const tags = list(interests)
    const r = actions.saveUser({ ...u, ...(me.role === 'instructor' ? { expertise: tags } : { interests: tags }), links: u.links.filter((l) => l.label.trim() || l.url.trim()) })
    if (!r.ok) return setErrors(r.errors), toast('Check the highlighted fields', { tone: 'error' })
    setErrors({})
    toast('Profile saved')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={me.role === 'instructor' ? 'Instructor Profile' : 'My Profile'} description={me.role === 'instructor' ? 'Shown on your course pages and in the instructor showcase.' : 'Your name appears on certificates exactly as written here.'} />
      <form className="space-y-6" onSubmit={(e) => (e.preventDefault(), save())} noValidate>
        <Section title="Photo">
          <div className="flex items-center gap-4">
            <Avatar user={u} size="xl" />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface-2">
                <ImagePlus className="size-4" />Upload photo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => {
                  const r = await readImage(e.target.files?.[0])
                  e.target.value = ''
                  'url' in r ? set({ avatar: r.url }) : toast(r.error, { tone: 'error' })
                }} />
              </label>
              {u.avatar && <Button variant="ghost" icon={<Trash2 />} onClick={() => set({ avatar: null })}>Remove</Button>}
            </div>
          </div>
          <p className="mt-3 text-xs text-faint">Stored in this browser only (under 600 KB). Production apps should upload images to file storage.</p>
        </Section>
        <Section title="About you">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name}>{(p) => <Input {...p} value={u.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />}</Field>
            <Field label="Email" required error={errors.email}>{(p) => <Input {...p} type="email" value={u.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />}</Field>
            <Field label={me.role === 'instructor' ? 'Job title' : 'Headline'} className="sm:col-span-2">{(p) => <Input {...p} value={u.title} onChange={(e) => set({ title: e.target.value })} placeholder={me.role === 'instructor' ? 'Senior Lecturer in…' : 'e.g. Operations analyst learning data science'} />}</Field>
            <Field label="Biography" error={errors.bio} hint={`${u.bio.length}/1000`} className="sm:col-span-2">{(p) => <Textarea {...p} value={u.bio} onChange={(e) => set({ bio: e.target.value })} maxLength={1000} />}</Field>
            <Field label={me.role === 'instructor' ? 'Areas of expertise' : 'Learning interests'} hint="Separate with commas. Used for course recommendations." className="sm:col-span-2">{(p) => <Input {...p} value={interests} onChange={(e) => setInterests(e.target.value)} />}</Field>
            <Field label="Time zone">{(p) => <Select {...p} value={u.timezone} onChange={(e) => set({ timezone: e.target.value })}>{timezones.map((z) => <option key={z}>{z}</option>)}</Select>}</Field>
            {me.role === 'student' && <Field label="Weekly learning goal (hours)" error={errors.weeklyGoalMinutes}>{(p) => <Input {...p} type="number" min={0} max={50} step={0.5} value={u.weeklyGoalMinutes / 60} onChange={(e) => set({ weeklyGoalMinutes: Math.round(Number(e.target.value) * 60) })} />}</Field>}
          </div>
        </Section>
        {me.role === 'instructor' && (
          <Section title="Professional links" action={<Button size="sm" variant="ghost" icon={<Plus />} onClick={() => set({ links: [...u.links, { label: '', url: '' }] })}>Add link</Button>}>
            {errors.links && <p className="mb-2 text-sm text-danger" role="alert">{errors.links}</p>}
            {u.links.length === 0 && <p className="text-sm text-muted">No links yet.</p>}
            <ul className="space-y-2">
              {u.links.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <Input aria-label="Link label" value={l.label} placeholder="Label" className="w-40" onChange={(e) => set({ links: u.links.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} />
                  <Input aria-label="Link URL" value={l.url} placeholder="https://" onChange={(e) => set({ links: u.links.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)) })} />
                  <Button variant="ghost" size="icon" aria-label="Remove link" icon={<Trash2 />} onClick={() => set({ links: u.links.filter((_, k) => k !== i) })} />
                </li>
              ))}
            </ul>
          </Section>
        )}
        {me.role === 'instructor' && (
          <Section title="Courses taught">
            <ul className="divide-y divide-line">
              {teaching.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link to={`/teach/builder?course=${c.id}`} className="font-medium hover:text-primary">{c.title}</Link>
                  <Badge color={courseStatusMeta[c.status].color}>{courseStatusMeta[c.status].label}</Badge>
                </li>
              ))}
            </ul>
          </Section>
        )}
        <div className="flex gap-2">
          <Button type="submit" variant="primary">Save profile</Button>
          <Button onClick={() => (setU(me), setErrors({}))}>Discard changes</Button>
        </div>
      </form>
    </div>
  )
}
