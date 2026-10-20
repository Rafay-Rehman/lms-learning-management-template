import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { SearchX, SlidersHorizontal } from 'lucide-react'
import type { Level } from '@/types'
import { CourseCard, useCatalog } from '@/components/courses/CourseCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, FilterSelect, PageHeader, SearchInput } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { useStore } from '@/state/store'

const PAGE = 9
const durations = { short: ['Under 10 hours', 0, 10], medium: ['10–20 hours', 10, 20], long: ['Over 20 hours', 20, Infinity] } as const

/** Course catalog. Filters live in the URL so results can be shared and survive refresh. */
export default function CatalogPage() {
  const { data } = useStore()
  const { pathname } = useLocation()
  const inApp = pathname.startsWith('/learn')
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const set = (patch: Record<string, string>) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
      if (!('shown' in patch)) next.delete('shown')
      return next
    }, { replace: true })
  const q = get('q'), category = get('category'), level = get('level'), duration = get('duration'), rating = get('rating'), price = get('price'), sort = get('sort') || 'popular'
  const shown = Number(get('shown')) || PAGE
  const all = useCatalog()

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const rows = all.filter(({ course: c, instructor, rating: r }) => {
      if (term && ![c.title, c.shortDescription, instructor?.name, ...c.tags].some((s) => s?.toLowerCase().includes(term))) return false
      if (category && c.categoryId !== category) return false
      if (level && c.level !== level) return false
      if (duration) {
        const [, lo, hi] = durations[duration as keyof typeof durations]
        if (!(c.estimatedHours >= lo && c.estimatedHours < hi)) return false
      }
      if (rating && r < Number(rating)) return false
      if (price === 'free' && c.price > 0) return false
      if (price === 'paid' && c.price === 0) return false
      return true
    })
    const by = {
      popular: (a: (typeof rows)[0], b: (typeof rows)[0]) => b.learners - a.learners,
      newest: (a: (typeof rows)[0], b: (typeof rows)[0]) => (b.course.publishedAt ?? '').localeCompare(a.course.publishedAt ?? ''),
      rating: (a: (typeof rows)[0], b: (typeof rows)[0]) => b.rating - a.rating || b.reviews - a.reviews,
      title: (a: (typeof rows)[0], b: (typeof rows)[0]) => a.course.title.localeCompare(b.course.title),
    }[sort as 'popular'] ?? (() => 0)
    return rows.sort(by)
  }, [all, q, category, level, duration, rating, price, sort])
  const active = [category, level, duration, rating, price].filter(Boolean).length

  return (
    <div className={cn(!inApp && 'mx-auto max-w-[1240px] px-4 py-10 sm:px-6')}>
      <PageHeader title={inApp ? 'Explore Courses' : 'Course catalog'} description={`${all.length} published courses across ${data.categories.length} categories. Free courses are marked; paid enrollment in this demo never takes a payment.`} />

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={(v) => set({ q: v })} placeholder="Search by course, instructor or topic" className="lg:w-80" />
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Category" value={category} onChange={(v) => set({ category: v })}>
            <option value="">All categories</option>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Difficulty" value={level} onChange={(v) => set({ level: v })}>
            <option value="">Any level</option>
            {(['beginner', 'intermediate', 'advanced'] as Level[]).map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
          </FilterSelect>
          <FilterSelect label="Duration" value={duration} onChange={(v) => set({ duration: v })}>
            <option value="">Any length</option>
            {Object.entries(durations).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </FilterSelect>
          <FilterSelect label="Rating" value={rating} onChange={(v) => set({ rating: v })}>
            <option value="">Any rating</option>
            <option value="4.5">4.5 and up</option>
            <option value="4">4.0 and up</option>
            <option value="3">3.0 and up</option>
          </FilterSelect>
          <FilterSelect label="Price" value={price} onChange={(v) => set({ price: v })}>
            <option value="">Free and paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </FilterSelect>
          {active > 0 && <Button size="sm" variant="ghost" onClick={() => set({ category: '', level: '', duration: '', rating: '', price: '' })}>Clear {active} filter{active > 1 ? 's' : ''}</Button>}
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span aria-live="polite">{results.length} course{results.length === 1 ? '' : 's'}</span>
        <label className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4" /> Sort by
          <FilterSelect label="Sort by" value={sort === 'popular' ? '' : sort} onChange={(v) => set({ sort: v })}>
            <option value="">Most popular</option>
            <option value="newest">Newest</option>
            <option value="rating">Highest rated</option>
            <option value="title">Title A–Z</option>
          </FilterSelect>
        </label>
      </div>

      {results.length === 0 ? (
        <EmptyState icon={<SearchX />} title="No courses match" body="Try fewer filters or a broader search term." action={<Button onClick={() => setParams({}, { replace: true })}>Reset search and filters</Button>} className="panel" />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, shown).map((e) => <CourseCard key={e.course.id} entry={e} to={inApp ? `/learn/explore/${e.course.slug}` : `/courses/${e.course.slug}`} />)}
          </div>
          {shown < results.length && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Button onClick={() => set({ shown: String(shown + PAGE) })}>Load more courses</Button>
              <span className="text-xs text-faint">Showing {shown} of {results.length}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
