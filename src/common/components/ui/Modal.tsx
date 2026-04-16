import clsx from 'clsx'
import { ChevronLeft, X } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from './Button'

type ModalProps = {
  open: boolean
  title: ReactNode
  children: ReactNode
  subtitle?: ReactNode
  onClose?: () => void
  onBack?: () => void
  titleIcon?: ReactNode
  footer?: ReactNode
  maxWidth?: string
  zIndex?: 'z-50' | 'z-60'
  as?: 'div' | 'form'
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void
  containerClassName?: string
  /** Optional step indicator shown next to the title (e.g. step 1 of 2). */
  step?: { current: number; total: number }
  /** If provided and truthy, clicking the close button will prompt for confirmation before calling onClose. */
  dirtyConfirmMessage?: string | null
}

export function Modal({
  open,
  title,
  children,
  subtitle,
  onClose,
  onBack,
  titleIcon,
  footer,
  maxWidth = 'max-w-xl',
  zIndex = 'z-50',
  as: Tag = 'div',
  onSubmit,
  containerClassName,
  step,
  dirtyConfirmMessage,
}: ModalProps) {
  if (!open) return null

  const handleCloseRequest = () => {
    if (!onClose) return
    if (dirtyConfirmMessage) {
      const ok = window.confirm(dirtyConfirmMessage)
      if (!ok) return
    }
    onClose()
  }

  const titleRow = (
    <div className={`${subtitle ? 'mb-1' : 'mb-4'} flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        {onBack && (
          <Button type="button" onClick={onBack} variant="icon" className="mr-0.5">
            <ChevronLeft size={16} />
          </Button>
        )}
        {titleIcon}
        <h3 className="font-semibold text-white">{title}</h3>
        {step && step.total > 1 && (
          <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-caption font-semibold text-white/50 tabular-nums">
            Étape {step.current}/{step.total}
          </span>
        )}
      </div>
      {onClose && (
        <Button type="button" onClick={handleCloseRequest} variant="icon" aria-label="Fermer">
          <X size={15} />
        </Button>
      )}
    </div>
  )

  const inner = (
    <>
      {titleRow}
      {subtitle && <p className="mb-4 mt-0.5 text-label text-white/40">{subtitle}</p>}
      {children}
      {footer && <div className="flex gap-2">{footer}</div>}
    </>
  )

  const containerCls = clsx(
    'w-full max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-bg-overlay/98 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]',
    maxWidth,
    containerClassName,
  )

  return (
    <div
      className={`absolute inset-0 ${zIndex} flex items-center justify-center bg-black/55 backdrop-blur-sm px-4`}
    >
      {Tag === 'form' ? (
        <form className={containerCls} onSubmit={onSubmit}>
          {inner}
        </form>
      ) : (
        <div className={containerCls}>{inner}</div>
      )}
    </div>
  )
}
