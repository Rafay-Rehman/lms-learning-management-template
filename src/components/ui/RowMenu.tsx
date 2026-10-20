import { MoreHorizontal } from 'lucide-react'
import { Menu, type MenuItem } from './Menu'

/** "…" menu for row actions in tables and cards. */
export function RowMenu({ label, items }: { label: string; items: (MenuItem | 'divider')[] }) {
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Menu
        width="w-52"
        trigger={(p) => (
          <button {...p} aria-label={label} className="grid size-8 place-items-center rounded-[var(--r-ctl)] text-muted hover:bg-surface-3 hover:text-ink">
            <MoreHorizontal className="size-4" />
          </button>
        )}
        items={items}
      />
    </span>
  )
}
