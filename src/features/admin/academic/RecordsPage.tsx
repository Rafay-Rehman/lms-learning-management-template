import { useState, type ReactNode } from 'react'
import { Download, PenSquare, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { MenuItem } from '@/components/ui/Menu'
import { Dialog, useConfirm } from '@/components/ui/Overlay'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, PageHeader, SearchInput, Toolbar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/csv'
import type { Result } from '@/state/actions'
import { report } from '@/state/selectors'

/**
 * Shared list + form page for small academic records (years, terms,
 * departments…). Each page supplies its columns, form fields and actions;
 * validation lives in the store actions.
 */
export function RecordsPage<T extends { id: string; name: string }>({
  title, description, noun, icon, rows, columns, blank, form, save, remove, extraActions, csv, toolbar, filter,
}: {
  title: string
  description: string
  noun: string
  icon: ReactNode
  rows: T[]
  columns: Column<T>[]
  blank: () => T
  form: (value: T, set: (patch: Partial<T>) => void, errors: Record<string, string>) => ReactNode
  save: (value: T) => Result
  remove: (value: T) => Result
  extraActions?: (value: T) => MenuItem[]
  csv?: (rows: T[]) => (string | number | null | undefined)[][]
  toolbar?: ReactNode
  filter?: (row: T) => boolean
}) {
  const toast = useToast()
  const [confirm, dialog] = useConfirm()
  const [edit, setEdit] = useState<{ value: T; isNew: boolean } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const shown = rows.filter((r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!filter || filter(r)))
  const submit = () => {
    const r = save(edit!.value)
    if (!r.ok) return setErrors(r.errors)
    toast(`${noun[0].toUpperCase() + noun.slice(1)} ${edit!.isNew ? 'created' : 'saved'}`)
    setEdit(null)
    setErrors({})
  }
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {csv && <Button icon={<Download />} onClick={() => downloadCsv(`${title.toLowerCase().replace(/\W+/g, '-')}.csv`, csv(shown))}>Export CSV</Button>}
            <Button variant="primary" icon={<Plus />} onClick={() => (setEdit({ value: blank(), isNew: true }), setErrors({}))}>New {noun}</Button>
          </>
        }
      />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder={`Search ${title.toLowerCase()}`} className="w-full sm:w-64" />
        {toolbar}
      </Toolbar>
      <div className="panel overflow-hidden">
        <DataTable
          label={title}
          rows={shown}
          onRowClick={(r) => (setEdit({ value: r, isNew: false }), setErrors({}))}
          empty={<EmptyState icon={icon} title={rows.length ? 'Nothing matches' : `No ${title.toLowerCase()} yet`} body={rows.length ? 'Try another search.' : `Create the first ${noun}.`} />}
          columns={[
            ...columns,
            {
              key: 'actions', header: <span className="sr-only">Actions</span>,
              cell: (r) => (
                <RowMenu
                  label={`Actions for ${r.name}`}
                  items={[
                    { label: 'Edit', icon: <PenSquare />, onSelect: () => (setEdit({ value: r, isNew: false }), setErrors({})) },
                    ...(extraActions?.(r) ?? []),
                    'divider',
                    { label: 'Delete…', icon: <Trash2 />, danger: true, onSelect: () => confirm({ title: `Delete ${r.name}?`, body: `Records that still use this ${noun} block deletion, so historical data is never orphaned.`, confirmLabel: 'Delete', onConfirm: () => report(toast, remove(r), `${noun[0].toUpperCase() + noun.slice(1)} deleted`) }) },
                  ]}
                />
              ),
            },
          ]}
        />
      </div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? `New ${noun}` : `Edit ${noun}`} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={submit}>{edit?.isNew ? `Create ${noun}` : 'Save changes'}</Button></>}>
        {edit && (
          <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), submit())} noValidate>
            {errors.form && <p className="rounded-[var(--r-ctl)] bg-danger/10 p-3 text-sm text-danger sm:col-span-2" role="alert">{errors.form}</p>}
            {form(edit.value, (p) => setEdit((x) => ({ ...x!, value: { ...x!.value, ...p } })), errors)}
          </form>
        )}
      </Dialog>
      {dialog}
    </div>
  )
}
