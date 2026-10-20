import { useState } from 'react'
import { Link } from 'react-router'
import type { PlatformSettings } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { PageHeader, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { timezones } from '@/features/settings/ProfilePage'
import { useStore } from '@/state/store'

const languages = [['en-GB', 'English (UK)'], ['en-US', 'English (US)'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['es-ES', 'Español']]

export default function PlatformSettingsPage() {
  const { data, actions } = useStore()
  const toast = useToast()
  const [s, setS] = useState<PlatformSettings>(data.settings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings)
  const save = () => {
    const r = actions.updateSettings(s)
    if (!r.ok) return setErrors(r.errors), toast(Object.values(r.errors)[0], { tone: 'error' })
    setErrors({})
    toast('Platform settings saved')
  }
  const sub = <K extends 'certificate' | 'learning' | 'publication' | 'academic'>(k: K, p: Partial<PlatformSettings[K]>) => setS({ ...s, [k]: { ...s[k], ...p } })
  return (
    <form className="mx-auto max-w-4xl" onSubmit={(e) => (e.preventDefault(), save())} noValidate>
      <PageHeader title="Platform Settings" description={<>Organization-wide settings. Colors, fonts and logo live in <Link className="link" to="/admin/theme">Theme & Branding</Link>.</>} actions={<><Button disabled={!dirty} onClick={() => (setS(data.settings), setErrors({}))}>Discard</Button><Button type="submit" variant="primary" disabled={!dirty}>Save settings</Button></>} />
      <div className="space-y-6">
        <Section title="General">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platform name" required error={errors.name}>{(p) => <Input {...p} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />}</Field>
            <Field label="Tagline">{(p) => <Input {...p} value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} />}</Field>
            <Field label="Description" className="sm:col-span-2">{(p) => <Textarea {...p} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} />}</Field>
            <Field label="Support email" error={errors.supportEmail}>{(p) => <Input {...p} type="email" value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} />}</Field>
            <Field label="Default language" hint="Sets date and number formatting. Interface translations aren’t included.">{(p) => <Select {...p} value={s.language} onChange={(e) => setS({ ...s, language: e.target.value })}>{languages.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
            <Field label="Time zone">{(p) => <Select {...p} value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })}>{timezones.map((z) => <option key={z}>{z}</option>)}</Select>}</Field>
          </div>
        </Section>
        <Section title="Academic structure">
          <p className="mb-2 text-sm text-muted">Turn off levels your organization doesn’t use. Hidden levels disappear from navigation and forms; existing data is kept.</p>
          <div className="divide-y divide-line">
            <Switch label="Academic years" checked={s.academic.years} onChange={(v) => sub('academic', { years: v, terms: v && s.academic.terms })} />
            <Switch label="Terms / semesters" description="Requires academic years." checked={s.academic.terms} onChange={(v) => sub('academic', { terms: v && s.academic.years })} />
            <Switch label="Faculties" checked={s.academic.faculties} onChange={(v) => sub('academic', { faculties: v })} />
            <Switch label="Departments" checked={s.academic.departments} onChange={(v) => sub('academic', { departments: v })} />
            <Switch label="Subjects" description="Group courses into academic subjects." checked={s.academic.subjects} onChange={(v) => sub('academic', { subjects: v })} />
          </div>
        </Section>
        <Section title="Learning">
          <div className="divide-y divide-line">
            <Switch label="Quiz lessons require a pass" description="Off: submitting any attempt completes the lesson." checked={s.learning.quizMustPass} onChange={(v) => sub('learning', { quizMustPass: v })} />
            <Switch label="Allow late submissions" description="Assignments that allow late work accept it, marked as late." checked={s.learning.allowLateSubmissions} onChange={(v) => sub('learning', { allowLateSubmissions: v })} />
          </div>
          <Field label="Default weekly goal for new students (minutes)" error={errors.defaultWeeklyGoal} className="mt-3 max-w-xs">{(p) => <Input {...p} type="number" min={0} max={3000} value={s.learning.defaultWeeklyGoal} onChange={(e) => sub('learning', { defaultWeeklyGoal: Number(e.target.value) })} />}</Field>
        </Section>
        <Section title="Course publication rules">
          <Switch label="Require review before publishing" description="Instructors submit courses; an administrator publishes them." checked={s.publication.requireReview} onChange={(v) => sub('publication', { requireReview: v })} />
          <Field label="Minimum lessons to publish" error={errors.minLessons} className="mt-3 max-w-xs">{(p) => <Input {...p} type="number" min={1} max={50} value={s.publication.minLessons} onChange={(e) => sub('publication', { minLessons: Number(e.target.value) })} />}</Field>
        </Section>
        <Section title="Certificate branding">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issuing organization" required error={errors.issuer}>{(p) => <Input {...p} value={s.certificate.issuer} onChange={(e) => sub('certificate', { issuer: e.target.value })} />}</Field>
            <Field label="Signatory name">{(p) => <Input {...p} value={s.certificate.signatoryName} onChange={(e) => sub('certificate', { signatoryName: e.target.value })} />}</Field>
            <Field label="Signatory title">{(p) => <Input {...p} value={s.certificate.signatoryTitle} onChange={(e) => sub('certificate', { signatoryTitle: e.target.value })} />}</Field>
            <Field label="Footnote">{(p) => <Input {...p} value={s.certificate.footnote} onChange={(e) => sub('certificate', { footnote: e.target.value })} />}</Field>
          </div>
          <Switch label="Show seal" checked={s.certificate.showSeal} onChange={(v) => sub('certificate', { showSeal: v })} />
          <p className="mt-2 text-xs text-faint">Certificates already issued keep the issuer name they were issued with.</p>
        </Section>
      </div>
    </form>
  )
}
