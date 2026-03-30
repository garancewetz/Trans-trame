import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import clsx from 'clsx'

type Variant =
  | 'unstyled'
  | 'modalSecondary'
  | 'buttonIcon'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  variant?: Variant
  className?: string
  style?: CSSProperties
}

const VARIANT: Record<Variant, string> = {
  unstyled: '',
  modalSecondary: 'flex-1 cursor-pointer rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-[0.75rem] font-semibold text-white/55 transition-all hover:text-white',
  buttonIcon: 'cursor-pointer rounded-lg p-1 text-white/30 transition-colors hover:text-white',
}

export default function Button({ variant = 'unstyled', className, style, type = 'button', ...props }: Props) {
  return <button type={type} className={clsx(VARIANT[variant], className)} style={style} {...props} />
}

