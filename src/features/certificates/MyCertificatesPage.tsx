import { Link } from 'react-router'
import { Award } from 'lucide-react'
import { CourseArt } from '@/components/courses/CourseArt'
import { Badge, Progress } from '@/components/ui/Badges'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, PageHeader, Section } from '@/components/ui/misc'
import { formatDate } from '@/lib/date'
import { progressOf } from '@/services/learning'
import { useLookup, useMe, useMyEnrollments } from '@/state/selectors'
import { useStore } from '@/state/store'

export default function MyCertificatesPage() {
  const { data } = useStore()
  const me = useMe()
  const look = useLookup()
  const certs = data.certificates.filter((c) => c.userId === me.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  const toward = useMyEnrollments().filter((e) => e.status === 'active' && e.course.awardsCertificate)
  return (
    <div>
      <PageHeader title="Certificates" description="Certificates are issued automatically when you finish every required lesson and pass the required quizzes." />
      {certs.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {certs.map((c) => {
            const course = look.course(c.courseId)
            return (
              <article key={c.id} className="panel overflow-hidden">
                {course && <CourseArt course={course} className="aspect-[5/2]" />}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-base leading-snug font-semibold">{c.courseTitle}</h2>
                    {c.status === 'valid' ? <Badge color="var(--success)">Valid</Badge> : <Badge color="var(--danger)">Revoked</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted">Issued {formatDate(c.issuedAt.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' })} · {c.code}</p>
                  <div className="mt-4 flex gap-2">
                    <ButtonLink size="sm" variant="primary" to={`/learn/certificates/${c.id}`}>View & print</ButtonLink>
                    <ButtonLink size="sm" to={`/verify/${c.code}`}>Verify</ButtonLink>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={<Award />} title="No certificates yet" body="Finish a course that awards a certificate and it will appear here." action={<ButtonLink to="/learn/explore" variant="primary">Find a course</ButtonLink>} className="panel" />
      )}
      {toward.length > 0 && (
        <Section title="Working toward" className="mt-6">
          <ul className="divide-y divide-line">
            {toward.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-4 py-3">
                <Link to={`/learn/course/${e.course.id}/overview`} className="min-w-48 flex-1 font-medium hover:text-primary">{e.course.title}</Link>
                <div className="flex w-56 items-center gap-2"><Progress value={progressOf(e.course, e)} label={`${e.course.title} progress`} /><span className="text-xs tabular">{progressOf(e.course, e)}%</span></div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
