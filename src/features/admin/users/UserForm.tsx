import { useState } from 'react'
import type { AppData, Role, User } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Switch } from '@/components/ui/Field'
import { Dialog } from '@/components/ui/Overlay'
import { useToast } from '@/components/ui/Toast'
import { roleLabel } from '@/services/permissions'
import { useStore } from '@/state/store'

export function blankUser(data: AppData, role: Role): User {
  return {
    id: `u-${crypto.randomUUID().slice(0, 8)}`, name: '', email: '', role, active: true, title: '', bio: '', color: ['#3d41d6', '#0d7f89', '#b04d9a', '#c9790f', '#22804f'][data.users.length % 5], avatar: null,
    interests: [], expertise: [], links: [], timezone: data.settings.timezone, weeklyGoalMinutes: data.settings.learning.defaultWeeklyGoal, departmentId: null,
    notificationPrefs: { enrollment: true, completion: true, deadline: true, quiz: true, announcement: true, feedback: true, certificate: true, system: true }, createdAt: new Date().toISOString(), lastActiveAt: null,
  }
}

/** Create or edit any account. Role changes are validated by the store (e.g. instructors who still own courses). */
export function UserDialog({ value, onClose, onSaved }: { value: User | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const { data, actions } = useStore()
  const toast = useToast()
  const [u, setU] = useState<User | null>(value)
  const [errors, setErrors] = useState<Record<string, string>>({})
  if (value && u?.id !== value.id) (setU(value), setErrors({}))
  const isNew = !!value && !data.users.some((x) => x.id === value.id)
  const save = () => {
    const r = actions.saveUser(u!)
    if (!r.ok) return setErrors(r.errors)
    toast(isNew ? `${roleLabel[u!.role]} account created for ${u!.name}` : 'Account saved')
    onSaved?.(u!.id)
    onClose()
  }
  const set = (p: Partial<User>) => setU((x) => ({ ...x!, ...p }))
  return (
    <Dialog open={!!value} onClose={onClose} title={isNew ? 'Create demo user' : 'Edit account'} description={isNew ? 'Demo accounts have no password — sign-in is simulated. Connect an identity provider before going live.' : undefined} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{isNew ? 'Create user' : 'Save changes'}</Button></>}>
      {u && (
        <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save())} noValidate>
          {errors.form && <p className="text-sm text-danger sm:col-span-2" role="alert">{errors.form}</p>}
          <Field label="Full name" required error={errors.name}>{(p) => <Input {...p} value={u.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
          <Field label="Email" required error={errors.email}>{(p) => <Input {...p} type="email" value={u.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
          <Field label="Role" error={errors.role} hint="In production, role changes must be authorized by the server.">{(p) => <Select {...p} value={u.role} onChange={(e) => set({ role: e.target.value as Role })}>{(['student', 'instructor', 'admin'] as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</Select>}</Field>
          <Field label="Title">{(p) => <Input {...p} value={u.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
          {u.role !== 'student' && data.settings.academic.departments && <Field label="Department">{(p) => <Select {...p} value={u.departmentId ?? ''} onChange={(e) => set({ departmentId: e.target.value || null })}><option value="">None</option>{data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>}
          <div className="sm:col-span-2">
            <Switch label="Active account" description="Deactivated users can’t be enrolled or switched to. Their history is kept." checked={u.active} onChange={(v) => set({ active: v })} />
            {errors.active && <p className="text-xs text-danger" role="alert">{errors.active}</p>}
          </div>
        </form>
      )}
    </Dialog>
  )
}
