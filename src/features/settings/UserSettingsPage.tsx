import { Monitor, Moon, Sun } from 'lucide-react'
import type { NotificationKind } from '@/types'
import { Field, Select, Switch } from '@/components/ui/Field'
import { PageHeader, Section, Segmented } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { kindMeta } from '@/features/notifications/NotificationList'
import { useMe } from '@/state/selectors'
import { useStore } from '@/state/store'
import { timezones } from './ProfilePage'

export default function UserSettingsPage() {
  const { actions, prefs, setPrefs, data } = useStore()
  const me = useMe()
  const toast = useToast()
  const saveUser = (patch: Partial<typeof me>, msg: string) => {
    const r = actions.saveUser({ ...me, ...patch })
    r.ok ? toast(msg) : toast(Object.values(r.errors)[0], { tone: 'error' })
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Display and accessibility settings apply to this browser. Notification and time-zone settings are saved to your account." />
      <div className="space-y-6">
        <Section title="Appearance">
          <p className="mb-2 text-sm font-medium">Color mode</p>
          <Segmented label="Color mode" value={prefs.mode ?? 'default'} onChange={(v) => setPrefs({ mode: v === 'default' ? null : v })} options={[{ value: 'light', label: 'Light', icon: <Sun /> }, { value: 'dark', label: 'Dark', icon: <Moon /> }, { value: 'default', label: `Platform default (${data.theme.mode})`, icon: <Monitor /> }]} />
          <div className="mt-4 divide-y divide-line">
            <Switch label="Reduce motion" description="Turns off animations and transitions." checked={prefs.reducedMotion} onChange={(v) => setPrefs({ reducedMotion: v })} />
            <Switch label="Larger text" description="Increases the interface text size by 10%." checked={prefs.largeText} onChange={(v) => setPrefs({ largeText: v })} />
          </div>
        </Section>
        <Section title="Language & region">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Time zone" hint="Used for deadlines and timestamps on your account.">{(p) => <Select {...p} value={me.timezone} onChange={(e) => saveUser({ timezone: e.target.value }, 'Time zone saved')}>{timezones.map((z) => <option key={z}>{z}</option>)}</Select>}</Field>
            <Field label="Language" hint="Interface translations aren’t bundled with this template.">{(p) => <Select {...p} value={data.settings.language} disabled><option value={data.settings.language}>{data.settings.language === 'en-GB' ? 'English (UK)' : data.settings.language}</option></Select>}</Field>
          </div>
        </Section>
        <Section title="Notifications">
          <p className="mb-1 text-sm text-muted">Choose which in-app notifications you see. Turning a type off hides it from your notification center and badge counts.</p>
          <div className="divide-y divide-line">
            {(Object.keys(kindMeta) as NotificationKind[]).map((k) => (
              <Switch key={k} label={kindMeta[k].label} checked={me.notificationPrefs[k]} onChange={(v) => saveUser({ notificationPrefs: { ...me.notificationPrefs, [k]: v } }, `${kindMeta[k].label} notifications ${v ? 'on' : 'off'}`)} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
