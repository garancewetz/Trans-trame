import type { CSSProperties, HTMLAttributes } from 'react'
import { axesGradient } from '@/lib/categories'

type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'style'> & {
  axes: string[]
  size?: 'small' | 'default'
  className?: string
  style?: CSSProperties
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  small: 'h-1.5 w-1.5',
  default: 'h-2 w-2',
}

export function AxesDot({ axes, size = 'default', className = '', style, ...props }: Props) {
  return (
    <span
      className={['shrink-0 rounded-full', SIZE_CLASS[size], className].filter(Boolean).join(' ')}
      style={{ background: axesGradient(axes || []), ...style }}
      {...props}
    />
  )
}

