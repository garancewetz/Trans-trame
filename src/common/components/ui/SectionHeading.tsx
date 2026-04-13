import type { ReactNode } from 'react'

type SectionHeadingProps = {
  children: ReactNode
  className?: string
  /** Accent color (rgba). When provided, adds a glowing dot and colors the title. */
  accent?: string
}

export function SectionHeading({ children, className, accent }: SectionHeadingProps) {
  return (
    <h3
      className={[
        'mb-4 flex items-center gap-2.5 text-micro font-semibold uppercase tracking-[0.22em]',
        accent ? '' : 'text-white/42',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={accent ? { color: accent } : undefined}
    >
      {accent && (
        <span
          aria-hidden
          className="h-[5px] w-[5px] shrink-0 rounded-full"
          style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
        />
      )}
      {children}
    </h3>
  )
}
