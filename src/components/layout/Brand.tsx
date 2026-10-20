import { cn } from '@/lib/cn'
import { useStore } from '@/state/store'

/** The platform logo: an uploaded image from Theme & Branding, or the bundled mark. */
export function Logo({ className }: { className?: string }) {
  const { data } = useStore()
  return <img src={data.settings.logo ?? '/assets/logo.svg'} alt="" className={cn('size-9 shrink-0 rounded-[10px] object-contain', className)} />
}

export function Brand({ className, subtle }: { className?: string; subtle?: boolean }) {
  const { data } = useStore()
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Logo />
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] leading-tight font-semibold">{data.settings.name}</span>
        {!subtle && <span className="block truncate text-xs opacity-70">{data.settings.tagline}</span>}
      </span>
    </span>
  )
}
