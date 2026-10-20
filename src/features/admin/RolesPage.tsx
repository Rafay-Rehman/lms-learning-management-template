import { useState } from 'react'
import { Check, Minus, ShieldCheck } from 'lucide-react'
import type { Role } from '@/types'
import { Avatar } from '@/components/ui/Badges'
import { Select } from '@/components/ui/Field'
import { PageHeader, SearchInput, Section } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { PERMISSIONS, roleLabel } from '@/services/permissions'
import { report } from '@/state/selectors'
import { useStore } from '@/state/store'

const roles: Role[] = ['student', 'instructor', 'admin']

export default function RolesPage() {
  const { data, actions } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const people = data.users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12)
  return (
    <div>
      <PageHeader title="User Roles & Permissions" description="What each role can do. Permissions are defined in src/services/permissions.ts and checked by both the interface and the data actions." />
      <p className="mb-6 flex items-start gap-3 rounded-[var(--r-ctl)] border border-warning/30 bg-warning/10 p-4 text-sm"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-warning" />This template runs entirely in the browser, so these checks shape the demo but aren’t security. A production deployment must enforce the same permissions on the server for every request and role change.</p>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section title="Permission matrix" bodyClassName="px-0 pb-0">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-faint"><th className="px-5 py-2.5 font-medium">Permission</th>{roles.map((r) => <th key={r} className="px-4 py-2.5 text-center font-medium">{roleLabel[r]}<span className="block font-normal">{data.users.filter((u) => u.role === r).length} users</span></th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {PERMISSIONS.map((p) => (
                  <tr key={p.key}>
                    <td className="px-5 py-2.5">{p.label}<span className="block text-xs text-faint">{p.key}</span></td>
                    {roles.map((r) => <td key={r} className="px-4 py-2.5 text-center">{(p.roles as readonly Role[]).includes(r) ? <Check className="mx-auto size-4 text-success" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-faint" aria-label="Not allowed" />}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Assign roles">
          <SearchInput value={q} onChange={setQ} placeholder="Find a person" />
          <ul className="mt-3 divide-y divide-line">
            {people.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <Avatar user={u} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">{u.name}</span>
                <Select aria-label={`Role for ${u.name}`} value={u.role} className="w-36" onChange={(e) => report(toast, actions.saveUser({ ...u, role: e.target.value as Role }), `${u.name} is now ${roleLabel[e.target.value as Role].toLowerCase()}`)}>
                  {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                </Select>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-faint">Instructors who own courses must have them reassigned before their role changes. At least one administrator must remain.</p>
        </Section>
      </div>
    </div>
  )
}
