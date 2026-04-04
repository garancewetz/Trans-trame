import type { ReactNode } from 'react'

type PillProps = {
  children: ReactNode
  suffix?: ReactNode
  title?: string
  className?: string
}

export function Pill({ children, suffix, title, className }: PillProps) {
  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.82rem] text-white/55',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={title}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green opacity-70" />
      <span className="truncate">{children}</span>
      {suffix != null && (
        <span className="shrink-0 tabular-nums text-white/30">{suffix}</span>
      )}
    </span>
  )
}
