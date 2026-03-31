import type { ReactNode } from 'react'

type InlineBadgeProps = {
  children: ReactNode
  className?: string
}

export function InlineBadge({ children, className }: InlineBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-[3px] text-[0.72rem] font-bold uppercase tracking-[0.5px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
