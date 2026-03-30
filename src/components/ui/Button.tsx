import type { ButtonHTMLAttributes, CSSProperties } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  className?: string
  style?: CSSProperties
}

export default function Button({ className, style, type = 'button', ...props }: Props) {
  return <button type={type} className={className} style={style} {...props} />
}

