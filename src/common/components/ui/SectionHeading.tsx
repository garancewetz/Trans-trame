import type { ReactNode } from 'react'

type SectionHeadingProps = {
  children: ReactNode
  className?: string
}

export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <h3
      className={[
        'mb-3 mt-5 text-[0.78rem] font-semibold uppercase tracking-[1.5px] text-white/35',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </h3>
  )
}
