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

export default function ConfirmButton({
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
    'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-[0.75rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30'

  const toneClass =
    tone === 'delete'
      ? confirmed
        ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.1)] text-[rgba(255,120,120,0.9)]'
        : 'border-[rgba(255,180,60,0.3)] bg-[rgba(255,180,60,0.06)] text-[rgba(255,200,100,0.8)] hover:bg-[rgba(255,180,60,0.12)]'
      : confirmed
        ? 'border-[rgba(255,200,60,0.55)] bg-[rgba(255,200,60,0.12)] text-[rgba(255,215,100,0.9)] hover:bg-[rgba(255,200,60,0.2)]'
        : 'border-[rgba(255,200,60,0.28)] bg-[rgba(255,200,60,0.06)] text-[rgba(255,210,80,0.7)] hover:bg-[rgba(255,200,60,0.12)]'

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
