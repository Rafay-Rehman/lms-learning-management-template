import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink shadow-sm hover:bg-primary-strong',
  secondary: 'bg-surface text-ink border border-line shadow-sm hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink hover:bg-surface-3',
  subtle: 'bg-primary-soft text-primary hover:bg-primary hover:text-primary-ink',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-[var(--r-btn)]',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-[var(--r-btn)]',
  icon: 'size-9 rounded-[var(--r-ctl)] justify-center',
  'icon-sm': 'size-7 rounded-lg justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
})

export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md', className?: string) =>
  cn('inline-flex shrink-0 items-center font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', variants[variant], sizes[size], className)

/** A router link that looks like a button (never nest a <button> inside a link). */
export function ButtonLink({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
