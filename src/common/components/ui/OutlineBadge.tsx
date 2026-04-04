import type { HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLSpanElement> & {
  className?: string
}

const BASE =
  'inline-flex items-center rounded-full border border-white/14 bg-white/6 px-1.5 py-px text-[0.72rem] text-white/65'

export function OutlineBadge({ className = '', ...props }: Props) {
  return <span className={[BASE, className].filter(Boolean).join(' ')} {...props} />
}

