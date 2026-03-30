import type { CSSProperties, HTMLAttributes } from 'react'

type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'style'> & {
  color: string
  className?: string
  style?: CSSProperties
}

const BASE =
  'inline-block rounded-full px-3 py-[3px] text-[0.68rem] font-bold uppercase tracking-[0.5px] text-black'

export default function AxisBadge({ color, className = '', style, ...props }: Props) {
  return <span className={[BASE, className].filter(Boolean).join(' ')} style={{ backgroundColor: color, ...style }} {...props} />
}

