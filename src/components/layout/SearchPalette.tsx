import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { BookOpen, CornerDownLeft, FileQuestion, Library, Search } from 'lucide-react'
import { allNavItems, visibleItems } from '@/app/navigation'
import { Avatar } from '@/components/ui/Badges'
import { Dialog } from '@/components/ui/Overlay'
import { Kbd } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { roleLabel } from '@/services/permissions'
import { useMe } from '@/state/selectors'
import { useStore } from '@/state/store'

type Group = 'Courses' | 'People' | 'Subjects' | 'Assessments' | 'Pages'
interface Result {
  id: string
  group: Group
  title: string
  hint?: string
  icon: React.ReactNode
  to: string
}
const order: Group[] = ['Courses', 'Subjects', 'Assessments', 'People', 'Pages']

/** Global search, scoped to what the current role can open. ⌘K / Ctrl+K or "/". */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useStore()
  const me = useMe()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) (setQ(''), setActive(0))
  }, [open])

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase()
    const match = (...s: (string | undefined)[]) => s.some((x) => x?.toLowerCase().includes(term))
    const out: Result[] = []
    if (term) {
      const teaching = me.role === 'admin' ? data.courses : me.role === 'instructor' ? data.courses.filter((c) => c.instructorId === me.id) : []
      const visible = me.role === 'student' ? data.courses.filter((c) => c.status === 'published' || data.enrollments.some((e) => e.userId === me.id && e.courseId === c.id)) : teaching
      for (const c of visible) {
        if (!match(c.title, c.tags.join(' '), data.users.find((u) => u.id === c.instructorId)?.name)) continue
        const enrolled = data.enrollments.some((e) => e.userId === me.id && e.courseId === c.id)
        const to = me.role === 'student' ? (enrolled ? `/learn/course/${c.id}/overview` : `/learn/explore/${c.slug}`) : me.role === 'admin' ? `/admin/courses?q=${encodeURIComponent(c.title)}` : `/teach/builder?course=${c.id}`
        out.push({ id: c.id, group: 'Courses', title: c.title, hint: c.status === 'published' ? undefined : c.status, icon: <BookOpen className="size-4 text-muted" />, to })
      }
      if (me.role === 'admin') {
        for (const s of data.subjects) if (match(s.name, s.code)) out.push({ id: s.id, group: 'Subjects', title: `${s.code} · ${s.name}`, icon: <Library className="size-4 text-muted" />, to: `/admin/subjects/${s.id}` })
        for (const u of data.users) if (match(u.name, u.email)) out.push({ id: u.id, group: 'People', title: u.name, hint: roleLabel[u.role], icon: <Avatar user={u} size="xs" />, to: `/admin/users/${u.id}` })
      }
      if (me.role === 'instructor') {
        const mine = new Set(teaching.map((c) => c.id))
        const ids = new Set(data.enrollments.filter((e) => mine.has(e.courseId)).map((e) => e.userId))
        for (const u of data.users.filter((x) => ids.has(x.id))) if (match(u.name, u.email)) out.push({ id: u.id, group: 'People', title: u.name, hint: u.email, icon: <Avatar user={u} size="xs" />, to: `/teach/students?q=${encodeURIComponent(u.name)}` })
      }
      if (me.role !== 'student') {
        const mine = new Set(teaching.map((c) => c.id))
        for (const z of data.quizzes.filter((x) => mine.has(x.courseId))) if (match(z.title)) out.push({ id: z.id, group: 'Assessments', title: z.title, hint: z.kind, icon: <FileQuestion className="size-4 text-muted" />, to: `/${me.role === 'admin' ? 'admin' : 'teach'}/quizzes/${z.id}` })
      }
    }
    const pages = visibleItems(allNavItems(me.role), data.website.hiddenNav, data.settings.academic)
    for (const n of pages) if (!term || match(n.label)) out.push({ id: n.to, group: 'Pages', title: n.label, hint: (n as { group?: string }).group, icon: <n.icon className="size-4 text-muted" />, to: n.to })
    return order.flatMap((g) => out.filter((r) => r.group === g).slice(0, term ? 6 : 14))
  }, [q, data, me])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (r?: Result) => {
    if (!r) return
    onClose()
    navigate(r.to)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Search" bare size="md">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-5 text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => (setQ(e.target.value), setActive(0))}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, results.length - 1)))
            if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)))
            if (e.key === 'Enter') (e.preventDefault(), choose(results[active]))
          }}
          role="combobox"
          aria-expanded
          aria-controls="search-results"
          aria-activedescendant={results[active] ? `res-${active}` : undefined}
          placeholder={me.role === 'student' ? 'Search courses and pages…' : 'Search courses, people, quizzes, pages…'}
          aria-label="Search"
          className="h-14 flex-1 bg-transparent text-base text-ink placeholder:text-faint focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul id="search-results" ref={listRef} role="listbox" aria-label="Results" className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-10 text-center text-sm text-muted">Nothing matches “{q}”. Try a course title, a person’s name or a subject code.</li>}
        {results.map((r, i) => (
          <li key={r.group + r.id}>
            {(i === 0 || results[i - 1].group !== r.group) && <div className="px-3 pt-2 pb-1 text-xs font-medium text-faint">{r.group}</div>}
            <div id={`res-${i}`} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => choose(r)} className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm', i === active ? 'bg-primary-soft text-ink' : 'text-ink')}>
              <span className="grid w-5 place-items-center">{r.icon}</span>
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
              {r.hint && <span className="hidden shrink-0 truncate text-xs text-faint capitalize sm:inline">{r.hint}</span>}
              {i === active && <CornerDownLeft className="size-3.5 text-faint" />}
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
