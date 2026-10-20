import { useState } from 'react'
import { Megaphone, PenSquare, Pin, Plus, Trash2 } from 'lucide-react'
import type { Announcement } from '@/types'
import { Avatar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { EmptyState, FilterSelect, PageHeader, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { timeAgo } from '@/lib/date'
import { uid } from '@/state/actions'
import { report, useLookup, useMe, useTeachingCourses } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function AnnouncementsPage() {
  const { data, actions } = useStore()
  const me = useMe()
  const look = useLookup()
  const toast = useToast()
  const [confirm, dialog] = useConfirm()
  const courses = useTeachingCourses().filter((c) => c.status !== 'archived')
  const ids = new Set(useTeachingCourses().map((c) => c.id))
  const [course, setCourse] = useState('')
  const [edit, setEdit] = useState<Announcement | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const list = data.announcements.filter((a) => ids.has(a.courseId) && (!course || a.courseId === course)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
  const audience = (courseId: string) => data.enrollments.filter((e) => e.courseId === courseId && (e.status === 'active' || e.status === 'completed')).length
  const save = () => {
    const isNew = !data.announcements.some((a) => a.id === edit!.id)
    const r = actions.saveAnnouncement(edit!)
    if (!r.ok) return setErrors(r.errors)
    toast(isNew ? `Posted — ${audience(edit!.courseId)} enrolled students see it in their course and notifications` : 'Announcement updated')
    setEdit(null)
    setErrors({})
  }
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Announcements" description="Course announcements appear on the course overview and as in-app notifications for enrolled students. No email is sent in this demo." actions={<Button variant="primary" icon={<Plus />} disabled={!courses.length} onClick={() => setEdit({ id: uid('an'), courseId: course || courses[0].id, authorId: me.id, title: '', body: '', pinned: false, createdAt: new Date().toISOString() })}>New announcement</Button>} />
      <Toolbar>
        <FilterSelect label="Course" value={course} onChange={setCourse}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</FilterSelect>
      </Toolbar>
      {list.length === 0 ? (
        <EmptyState icon={<Megaphone />} title="No announcements yet" body="Post one to tell enrolled students about schedule changes, live sessions or new material." className="panel" />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const author = look.user(a.authorId)
            return (
              <li key={a.id} className="panel p-5">
                <div className="flex items-start gap-3">
                  {author && <Avatar user={author} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">{a.pinned && <Pin className="size-3.5 text-highlight" aria-label="Pinned" />}{a.title}</p>
                    <p className="text-xs text-muted">{look.course(a.courseId)?.title} · {author?.name} · {timeAgo(a.createdAt)} · {audience(a.courseId)} students</p>
                    <p className="mt-2 text-sm whitespace-pre-line">{a.body}</p>
                  </div>
                  <Button size="icon-sm" variant="ghost" aria-label="Edit announcement" icon={<PenSquare />} onClick={() => setEdit(a)} />
                  <Button size="icon-sm" variant="ghost" aria-label="Delete announcement" icon={<Trash2 />} onClick={() => confirm({ title: 'Delete this announcement?', body: 'It disappears from the course page. Notifications already delivered stay in students’ lists.', confirmLabel: 'Delete', onConfirm: () => report(toast, actions.deleteAnnouncement(a.id), 'Announcement deleted') })} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Dialog open={!!edit} onClose={() => (setEdit(null), setErrors({}))} title={edit && data.announcements.some((a) => a.id === edit.id) ? 'Edit announcement' : 'New announcement'} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>{edit && data.announcements.some((a) => a.id === edit.id) ? 'Save' : 'Post announcement'}</Button></>}>
        {edit && (
          <form className="space-y-4 p-5" onSubmit={(e) => (e.preventDefault(), save())}>
            {errors.form && <p className="text-sm text-danger" role="alert">{errors.form}</p>}
            <Field label="Course" required error={errors.courseId}>{(p) => <Select {...p} value={edit.courseId} onChange={(e) => setEdit({ ...edit, courseId: e.target.value })}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>}</Field>
            <Field label="Title" required error={errors.title}>{(p) => <Input {...p} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={120} />}</Field>
            <Field label="Message" required error={errors.body}>{(p) => <Textarea {...p} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} className="min-h-36" />}</Field>
            <Checkbox label="Pin to the top of the course overview" checked={edit.pinned} onChange={(v) => setEdit({ ...edit, pinned: v })} />
          </form>
        )}
      </Dialog>
      {dialog}
    </div>
  )
}
