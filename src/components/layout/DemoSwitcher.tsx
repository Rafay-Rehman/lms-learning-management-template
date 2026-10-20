import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { BookOpen, GraduationCap, ShieldCheck } from 'lucide-react'
import type { Role } from '@/types'
import { Avatar } from '@/components/ui/Badges'
import { Dialog } from '@/components/ui/Overlay'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { roleHome, roleLabel } from '@/services/permissions'
import { useStore } from '@/state/store'

// The demo's stand-in for sign-in: pick any seeded account to see the app
// from that person's point of view. This is a convenience, not authentication.

const Ctx = createContext<(role?: Role) => void>(() => {})
export const useDemoSwitcher = () => useContext(Ctx)

const roleIcon = { student: GraduationCap, instructor: BookOpen, admin: ShieldCheck }
const blurb: Record<Role, string> = {
  student: 'Study courses, take quizzes, earn certificates',
  instructor: 'Build courses, grade work, follow your students',
  admin: 'Manage the academic structure, people, theme and website',
}

export function DemoSwitcherProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Role | 'any' | null>(null)
  const { data, actions } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const accounts = useMemo(() => {
    const pick = (role: Role, n: number) => data.users.filter((u) => u.role === role && u.active).slice(0, n)
    return { student: pick('student', 4), instructor: pick('instructor', 4), admin: pick('admin', 2) }
  }, [data.users])
  const roles: Role[] = open && open !== 'any' ? [open] : ['student', 'instructor', 'admin']

  return (
    <Ctx.Provider value={(role) => setOpen(role ?? 'any')}>
      {children}
      <Dialog open={!!open} onClose={() => setOpen(null)} title="Choose a demo account" description="Role switching is a demo convenience, not secure sign-in. Connect an identity provider before going live." size="lg">
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = roleIcon[role]
            return (
              <section key={role} className={cn('rounded-[var(--radius)] border border-line p-3', roles.length === 1 && 'md:col-span-3')}>
                <h3 className="flex items-center gap-2 px-1 text-sm font-semibold">
                  <Icon className="size-4 text-primary" /> {roleLabel[role]}
                </h3>
                <p className="mt-0.5 mb-2 px-1 text-xs text-muted">{blurb[role]}</p>
                <ul className="space-y-1">
                  {accounts[role].map((u) => (
                    <li key={u.id}>
                      <button
                        className={cn('flex w-full items-center gap-2.5 rounded-[var(--r-ctl)] px-2 py-1.5 text-left hover:bg-surface-3', u.id === data.currentUserId && 'bg-primary-soft')}
                        onClick={() => {
                          actions.setCurrentUser(u.id)
                          setOpen(null)
                          navigate(roleHome[u.role])
                          toast(`Now viewing as ${u.name}`, { tone: 'info' })
                        }}
                      >
                        <Avatar user={u} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{u.name}</span>
                          <span className="block truncate text-xs text-muted">{u.title || u.email}</span>
                        </span>
                        {u.id === data.currentUserId && <span className="text-xs text-primary">Current</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </Dialog>
    </Ctx.Provider>
  )
}
