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

const FOCUS_VISIBLE =
  'focus-visible:ring-2 focus-visible:ring-cyan/40 focus-visible:ring-offset-0'

const VARIANT: Record<Variant, string> = {
  default:
    `w-full rounded-lg border border-border-default bg-white/5 px-4 py-3 text-[0.95rem] text-white outline-none transition-all placeholder:text-text-secondary focus:border-cyan/40 focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.06)] ${FOCUS_VISIBLE}`,
  table:
    `bg-white/5 border border-border-default rounded-md px-2 py-1.5 text-[0.88rem] font-mono text-white outline-none placeholder:text-text-muted focus:border-cyan/35 focus:bg-white/8 transition-all w-full ${FOCUS_VISIBLE}`,
  picker:
    `w-full rounded-xl border border-border-default bg-white/5 px-10 py-3.5 text-[0.95rem] text-white outline-none transition-all placeholder:text-text-secondary focus:border-cyan/40 focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(140,220,255,0.08)] ${FOCUS_VISIBLE}`,
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
