import { useState } from 'react'
import { Eye, EyeOff, Star, Trash2 } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Overlay'
import { EmptyState, FilterSelect, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/date'
import { report, useLookup } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function ReviewsPage() {
  const { data, actions } = useStore()
  const look = useLookup()
  const toast = useToast()
  const [confirm, dialog] = useConfirm()
  const [q, setQ] = useState('')
  const [course, setCourse] = useState('')
  const [rating, setRating] = useState('')
  const [status, setStatus] = useState('')
  const rows = data.reviews.filter((r) => (!q || r.body.toLowerCase().includes(q.toLowerCase())) && (!course || r.courseId === course) && (!rating || r.rating === Number(rating)) && (!status || r.status === status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Course Reviews" description="Hidden reviews don’t count toward course ratings or appear on course pages." />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search review text" className="w-full sm:w-60" />
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
        <FilterSelect label="Rating" value={rating} onChange={setRating}><option value="">Any rating</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</FilterSelect>
        <FilterSelect label="Status" value={status} onChange={setStatus}><option value="">Published and hidden</option><option value="published">Published</option><option value="hidden">Hidden</option></FilterSelect>
      </Toolbar>
      {rows.length === 0 ? <EmptyState icon={<Star />} title="No reviews match" className="panel" /> : (
        <ul className="space-y-3">
          {rows.map((r) => { const u = look.user(r.userId); return (
            <li key={r.id} className="panel flex flex-wrap items-start gap-4 p-4">
              {u && <Avatar user={u} size="sm" />}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{u?.name}</span><span className="text-highlight" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="text-line-strong">{'★'.repeat(5 - r.rating)}</span></span>{r.status === 'hidden' && <Badge color="var(--faint)">Hidden</Badge>}</p>
                <p className="text-xs text-muted">{look.course(r.courseId)?.title} · {formatDate(r.createdAt.slice(0, 10))}</p>
                <p className="mt-2 text-sm">{r.body}</p>
              </div>
              <div className="flex gap-1">
                {r.status === 'published' ? <Button size="sm" icon={<EyeOff />} onClick={() => report(toast, actions.setReviewStatus(r.id, 'hidden'), 'Review hidden')}>Hide</Button> : <Button size="sm" icon={<Eye />} onClick={() => report(toast, actions.setReviewStatus(r.id, 'published'), 'Review published')}>Publish</Button>}
                <Button size="icon-sm" variant="ghost" aria-label="Delete review" icon={<Trash2 />} onClick={() => confirm({ title: 'Delete this review?', body: 'It’s removed permanently.', confirmLabel: 'Delete', onConfirm: () => report(toast, actions.setReviewStatus(r.id, 'deleted'), 'Review deleted') })} />
              </div>
            </li>
          ) })}
        </ul>
      )}
      {dialog}
    </div>
  )
}
