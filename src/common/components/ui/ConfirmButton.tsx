import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ConfirmButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> & {
  confirmed: boolean
  label: ReactNode
  confirmLabel: ReactNode
  onClick: () => void
  tone?: 'delete' | 'merge'
  icon?: ReactNode
  type?: 'button' | 'submit'
}

export function ConfirmButton({
  confirmed,
  label,
  confirmLabel,
  onClick,
  tone = 'delete',
  icon,
  type = 'button',
  disabled,
  className,
  ...props
}: ConfirmButtonProps) {
  const base =
    'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-[0.85rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30'

  const toneClass =
    tone === 'delete'
      ? confirmed
        ? 'border-red/[0.55] bg-red/10 text-red/90'
        : 'border-amber/30 bg-amber/6 text-amber/80 hover:bg-amber/12'
      : confirmed
        ? 'border-amber/[0.55] bg-amber/12 text-amber/90 hover:bg-amber/20'
        : 'border-amber/[0.28] bg-amber/6 text-amber/70 hover:bg-amber/12'

  const content = confirmed ? confirmLabel : label

  return (
    <button
      type={type}
      className={[base, toneClass, className].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon ? (
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {content}
        </span>
      ) : (
        content
      )}
    </button>
  )
}
