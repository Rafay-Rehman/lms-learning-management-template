import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Pagination } from './misc'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Makes the column sortable. */
  sort?: (row: T) => string | number
  align?: 'right'
  className?: string
}

/**
 * Sortable, paginated table. Rows navigate on click; put a real <Link> in the
 * first cell so the row is reachable by keyboard too.
 */
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  label,
  initialSort,
  pageSize = 15,
  onRowClick,
  empty,
  rowClassName,
  selected,
  onSelect,
}: {
  rows: T[]
  columns: Column<T>[]
  label: string
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  pageSize?: number
  onRowClick?: (row: T) => void
  empty: ReactNode
  rowClassName?: (row: T) => string | undefined
  /** Enables row checkboxes for bulk actions. */
  selected?: Set<string>
  onSelect?: (ids: Set<string>) => void
}) {
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key)
    if (!col?.sort) return rows
    const get = col.sort
    const dir = sort!.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir
    })
  }, [rows, columns, sort])
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => setPage(1), [rows.length, sort])
  const shown = sorted.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize)

  if (!rows.length) return <>{empty}</>
  return (
    <div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm" aria-label={label}>
          <thead>
            <tr className="border-b border-line text-left text-xs text-faint">
              {onSelect && (
                <th scope="col" className="w-10 pl-4">
                  <input type="checkbox" aria-label="Select all on this page" className="size-4 accent-[var(--primary)]" checked={shown.length > 0 && shown.every((r) => selected?.has(r.id))} onChange={(e) => {
                    const next = new Set(selected)
                    shown.forEach((r) => (e.target.checked ? next.add(r.id) : next.delete(r.id)))
                    onSelect(next)
                  }} />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('px-4 py-2.5 font-medium whitespace-nowrap', c.align === 'right' && 'text-right', c.className)}>
                    {c.sort ? (
                      <button
                        className={cn('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}
                        onClick={() => setSort({ key: c.key, dir: active && sort!.dir === 'asc' ? 'desc' : 'asc' })}
                      >
                        {c.header}
                        {active ? sort!.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((row) => (
              <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('transition-colors hover:bg-surface-2', onRowClick && 'cursor-pointer', selected?.has(row.id) && 'bg-primary-soft', rowClassName?.(row))}>
                {onSelect && (
                  <td className="w-10 pl-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label="Select row" className="size-4 accent-[var(--primary)]" checked={!!selected?.has(row.id)} onChange={(e) => {
                      const next = new Set(selected)
                      e.target.checked ? next.add(row.id) : next.delete(row.id)
                      onSelect(next)
                    }} />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle whitespace-nowrap', c.align === 'right' && 'text-right tabular', c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onPage={setPage} total={sorted.length} pageSize={pageSize} />
    </div>
  )
}
