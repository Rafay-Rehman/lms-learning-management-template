import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Award, BarChart3, Check, ClipboardCheck, MessagesSquare, Search, Smartphone } from 'lucide-react'
import type { LandingSectionId, WebsiteConfig } from '@/types'
import { CourseArt } from '@/components/courses/CourseArt'
import { CourseCard, useCatalog } from '@/components/courses/CourseCard'
import { Avatar, ProgressRing, Stars } from '@/components/ui/Badges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { iconFor } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { ratingOf } from '@/services/analytics'
import { counts, requiredLessons } from '@/services/learning'
import { useStore } from '@/state/store'

/** The hero's signature visual: a real course syllabus with progress ticked off. */
function SyllabusCard() {
  const { data } = useStore()
  const course = data.courses.find((c) => c.status === 'published' && data.website.featuredCourseIds.includes(c.id)) ?? data.courses.find((c) => c.status === 'published')
  if (!course) return null
  const req = requiredLessons(course)
  const done = Math.min(4, req.length - 1)
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden className="absolute -inset-4 -z-10 rotate-[-3deg] rounded-[calc(var(--radius)+8px)] bg-primary/10" />
      <div className="panel overflow-hidden shadow-lg">
        <CourseArt course={course} className="aspect-[3/1]" />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">Syllabus</p>
              <p className="font-display text-lg leading-snug font-semibold">{course.title}</p>
            </div>
            <ProgressRing value={(done / req.length) * 100} size={52} label="Example progress" />
          </div>
          <ol className="mt-4 space-y-2">
            {req.slice(0, 6).map((l, i) => (
              <li key={l.id} className="flex items-center gap-3 text-sm">
                <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border', i < done ? 'border-success bg-success text-white' : 'border-line-strong text-faint')}>
                  {i < done ? <Check className="size-3" strokeWidth={3} /> : <span className="text-[10px] tabular">{i + 1}</span>}
                </span>
                <span className={cn('truncate', i < done ? 'text-muted line-through decoration-line-strong' : i === done ? 'font-medium' : 'text-muted')}>{l.title}</span>
                {i === done && <span className="ml-auto shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">Up next</span>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function Hero({ w }: { w: WebsiteConfig }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/courses${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }
  return (
    <section className={cn('relative overflow-hidden border-b border-line', w.heroVisual === 'pattern' && 'bg-nav text-nav-strong')}>
      {w.heroVisual === 'pattern' && (
        <svg aria-hidden className="absolute inset-0 size-full opacity-25" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 400">
          {Array.from({ length: 14 }, (_, i) => <circle key={i} cx="720" cy="360" r={40 + i * 42} fill="none" stroke="currentColor" strokeWidth="1" />)}
        </svg>
      )}
      <div className={cn('relative mx-auto grid max-w-[1240px] items-center gap-12 px-4 py-14 sm:px-6 md:py-20', w.heroVisual === 'syllabus' && 'lg:grid-cols-[1.1fr_1fr]')}>
        <div className={cn(w.heroVisual !== 'syllabus' && 'mx-auto max-w-3xl text-center')}>
          <h1 className="text-[2.4rem] leading-[1.08] font-semibold sm:text-[3.2rem]">{w.headline}</h1>
          <p className={cn('mt-5 max-w-[56ch] text-lg', w.heroVisual === 'pattern' ? 'text-nav-ink' : 'text-muted', w.heroVisual !== 'syllabus' && 'mx-auto')}>{w.subheading}</p>
          <form onSubmit={submit} role="search" className={cn('mt-8 flex max-w-xl gap-2', w.heroVisual !== 'syllabus' && 'mx-auto')}>
            <label className="relative flex-1">
              <span className="sr-only">Search courses</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you want to learn?" className="h-12 w-full rounded-[var(--r-btn)] border border-line bg-surface pr-3 pl-11 text-base text-ink shadow-sm placeholder:text-faint focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none" />
            </label>
            <Button type="submit" variant="primary" className="h-12 px-5 text-base">{w.ctaText}</Button>
          </form>
        </div>
        {w.heroVisual === 'syllabus' && <SyllabusCard />}
      </div>
    </section>
  )
}

const benefits = [
  { icon: ClipboardCheck, title: 'Practice that counts', body: 'Quizzes explain every answer, and assignments get written feedback from your instructor.' },
  { icon: BarChart3, title: 'Progress you can see', body: 'Your dashboard shows what’s next, how far you’ve come and how close you are to your weekly goal.' },
  { icon: Award, title: 'Certificates you can verify', body: 'Finish the required lessons and quizzes and a certificate is issued, with an ID anyone can check.' },
  { icon: Smartphone, title: 'Study anywhere', body: 'Lessons, notes and quizzes work on your phone, so ten spare minutes can still move you forward.' },
  { icon: MessagesSquare, title: 'Real people teaching', body: 'Every course is led by a named lecturer who posts announcements and answers questions.' },
]

function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="text-[1.8rem] leading-tight font-semibold">{title}</h2>
      {body && <p className="mt-2 text-muted">{body}</p>}
    </div>
  )
}

export function Landing({ w }: { w: WebsiteConfig }) {
  const { data } = useStore()
  const featured = useCatalog(w.featuredCourseIds.map((id) => data.courses.find((c) => c.id === id)).filter((c) => c?.status === 'published') as never)
  const instructors = data.users.filter((u) => u.role === 'instructor' && u.active && data.courses.some((c) => c.instructorId === u.id && c.status === 'published'))
  const published = data.courses.filter((c) => c.status === 'published')
  const learners = new Set(data.enrollments.filter((e) => counts(e.status)).map((e) => e.userId)).size
  const ratings = data.reviews.filter((r) => r.status === 'published')
  const wrap = 'mx-auto max-w-[1240px] px-4 py-16 sm:px-6'

  const sections: Record<LandingSectionId, () => React.ReactNode> = {
    featured: () =>
      featured.length > 0 && (
        <section className={wrap}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle title="Featured courses" body="Chosen by our lecturers as the best places to start." />
            <ButtonLink to="/courses" className="mb-8">See all {published.length} courses</ButtonLink>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{featured.map((e) => <CourseCard key={e.course.id} entry={e} to={`/courses/${e.course.slug}`} compact />)}</div>
        </section>
      ),
    categories: () => (
      <section id="categories" className="scroll-mt-20 border-y border-line bg-surface">
        <div className={wrap}>
          <SectionTitle title="Popular subjects" body="Browse by area. Each category mixes beginner and advanced courses." />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.categories.filter((c) => w.visibleCategoryIds.includes(c.id)).map((c) => {
              const Icon = iconFor(c.icon)
              const n = published.filter((x) => x.categoryId === c.id).length
              return (
                <li key={c.id}>
                  <Link to={`/courses?category=${c.id}`} className="flex h-full items-start gap-3 rounded-[var(--radius)] border border-line p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[var(--r-ctl)]" style={{ background: `hsl(${c.hue} 50% 50% / .14)`, color: `hsl(${c.hue} 55% 40%)` }}><Icon className="size-5" /></span>
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className="block text-sm text-muted">{n} course{n === 1 ? '' : 's'}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    ),
    benefits: () => (
      <section className={wrap}>
        <SectionTitle title="Built around how people actually learn" />
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="flex gap-4">
              <b.icon className="mt-1 size-6 shrink-0 text-primary" strokeWidth={1.6} />
              <div>
                <h3 className="font-sans text-base font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    instructors: () => (
      <section id="instructors" className="scroll-mt-20 border-y border-line bg-surface">
        <div className={wrap}>
          <SectionTitle title="Learn from our lecturers" body="Every course is written and taught by Northfield staff." />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.map((u) => {
              const mine = published.filter((c) => c.instructorId === u.id)
              const rs = mine.map((c) => ratingOf(data, c.id)).filter((r) => r.count)
              const avg = rs.length ? rs.reduce((s, r) => s + r.rating * r.count, 0) / rs.reduce((s, r) => s + r.count, 0) : 0
              return (
                <li key={u.id} className="flex gap-4 rounded-[var(--radius)] border border-line p-4">
                  <Avatar user={u} size="lg" />
                  <div className="min-w-0">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted">{u.title}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>{mine.length} course{mine.length === 1 ? '' : 's'}</span>
                      {avg > 0 && <Stars value={avg} />}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    ),
    stats: () => (
      <section className={wrap}>
        <dl className="grid grid-cols-2 gap-6 border-y border-line py-10 md:grid-cols-4">
          {[
            [learners, 'learners enrolled'],
            [published.length, 'published courses'],
            [data.certificates.filter((c) => c.status === 'valid').length, 'certificates issued'],
            [ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : '—', 'average course rating'],
          ].map(([v, l]) => (
            <div key={l as string}>
              <dt className="sr-only">{l}</dt>
              <dd className="numeral text-[2.6rem] leading-none font-semibold text-primary">{v}</dd>
              <dd className="mt-2 text-sm text-muted">{l}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-faint">Figures are calculated live from the demo data.</p>
      </section>
    ),
    testimonials: () =>
      w.testimonials.length > 0 && (
        <section className="border-y border-line bg-surface">
          <div className={wrap}>
            <SectionTitle title="What learners say" />
            <div className="grid gap-6 md:grid-cols-3">
              {w.testimonials.map((t) => (
                <figure key={t.id} className="flex flex-col">
                  <blockquote className="flex-1 font-display text-lg leading-relaxed">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <Avatar name={t.name} color="var(--secondary)" />
                    <span>
                      <span className="block text-sm font-medium">{t.name}</span>
                      <span className="block text-xs text-muted">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ),
    faq: () =>
      w.faq.length > 0 && (
        <section id="faq" className={cn(wrap, 'scroll-mt-20')}>
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <SectionTitle title="Frequently asked questions" body={`Can’t find an answer? Email ${data.settings.supportEmail}.`} />
            <div className="divide-y divide-line border-y border-line">
              {w.faq.map((f) => (
                <details key={f.id} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {f.q}
                    <span className="text-xl leading-none text-faint transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-2 max-w-[65ch] text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ),
    cta: () => (
      <section className="bg-nav text-nav-strong">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-[1.8rem] font-semibold">Start with a free course this week</h2>
            <p className="mt-2 text-nav-ink">{published.filter((c) => c.price === 0).length} courses are free to join, no card needed.</p>
          </div>
          <ButtonLink to="/courses?price=free" variant="primary" className="h-11 px-5">Browse free courses</ButtonLink>
        </div>
      </section>
    ),
  }

  return (
    <>
      <Hero w={w} />
      {w.sections.filter((s) => s.visible).map((s) => <div key={s.id} data-section={s.id}>{sections[s.id]()}</div>)}
    </>
  )
}

export default function LandingPage() {
  const { data } = useStore()
  return <Landing w={data.website} />
}
