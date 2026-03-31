import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

type Props = {
  className?: string
  style?: CSSProperties
  children?: ReactNode
} & HTMLAttributes<HTMLDivElement>

// Panel est utilisé comme wrapper div dans ce projet.
export function Panel({ className, style, children, ...props }: Props) {
  return (
    <div className={className} style={style} {...props}>
      {children}
    </div>
  )
}

