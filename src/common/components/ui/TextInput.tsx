import type { CSSProperties, InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import clsx from 'clsx'

type Variant = 'default' | 'table' | 'picker'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type?: InputHTMLAttributes<HTMLInputElement>['type']
  variant?: Variant
  className?: string
  style?: CSSProperties
}

const VARIANT: Record<Variant, string> = {
  default:
    'w-full rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-[0.85rem] text-white outline-none transition-all placeholder:text-white/25 focus:border-[rgba(140,220,255,0.4)] focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.06)]',
  table:
    'bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-[0.78rem] font-mono text-white outline-none placeholder:text-white/18 focus:border-[rgba(140,220,255,0.35)] focus:bg-white/8 transition-all w-full',
  picker:
    'w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3.5 text-[0.85rem] text-white outline-none transition-all placeholder:text-white/25 focus:border-[rgba(140,220,255,0.4)] focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.08)]',
}

const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { variant = 'default', className, style, type = 'text', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={clsx(VARIANT[variant], className)}
      style={style}
      {...props}
    />
  )
})

export { TextInput }
