import type { CSSProperties, ChangeEvent, InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  className?: string
  style?: CSSProperties
  type?: string
}

export function SearchInput({ value, onChange, className, style, type = 'text', ...props }: Props) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      className={className}
      style={style}
      {...props}
    />
  )
}

