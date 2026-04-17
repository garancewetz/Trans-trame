import clsx from 'clsx'
import { ChevronLeft, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
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
  /** If provided and truthy, closing the modal will prompt for confirmation. */
  dirtyConfirmMessage?: string | null
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

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
  const titleId = useId()
  const containerRef = useRef<HTMLDivElement | HTMLFormElement | null>(null)
  const previouslyFocused = useRef<Element | null>(null)
  const [pendingClose, setPendingClose] = useState(false)

  // Restore focus to trigger + autofocus first element inside the modal.
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement
    const root = containerRef.current
    if (root) {
      const first = root.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }
    return () => {
      const prev = previouslyFocused.current
      if (prev instanceof HTMLElement) prev.focus()
    }
  }, [open])

  const handleCloseRequest = useCallback(() => {
    if (!onClose) return
    if (dirtyConfirmMessage) {
      setPendingClose(true)
      return
    }
    onClose()
  }, [onClose, dirtyConfirmMessage])

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleCloseRequest()
        return
      }
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [handleCloseRequest],
  )

  if (!open) return null

  const titleRow = (
    <div className={`${subtitle ? 'mb-1' : 'mb-4'} flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        {onBack && (
          <Button type="button" onClick={onBack} variant="icon" className="mr-0.5" aria-label="Retour">
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
        )}
        {titleIcon}
        <h3 id={titleId} className="font-semibold text-white">{title}</h3>
        {step && step.total > 1 && (
          <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-caption font-semibold text-white/60 tabular-nums">
            Étape {step.current}/{step.total}
          </span>
        )}
      </div>
      {onClose && (
        <Button type="button" onClick={handleCloseRequest} variant="icon" aria-label="Fermer">
          <X size={15} aria-hidden="true" />
        </Button>
      )}
    </div>
  )

  const inner = (
    <>
      {titleRow}
      {subtitle && <p className="mb-4 mt-0.5 text-label text-white/60">{subtitle}</p>}
      {children}
      {footer && <div className="flex gap-2">{footer}</div>}
    </>
  )

  const containerCls = clsx(
    'w-full max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-bg-overlay/98 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]',
    maxWidth,
    containerClassName,
  )

  const dialogProps = {
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-labelledby': typeof title === 'string' ? titleId : undefined,
    onKeyDown: handleKeyDown,
  }

  return (
    <div
      className={`absolute inset-0 ${zIndex} flex items-center justify-center bg-black/55 backdrop-blur-sm px-4`}
    >
      {Tag === 'form' ? (
        <form
          ref={containerRef as React.RefObject<HTMLFormElement>}
          className={containerCls}
          onSubmit={onSubmit}
          {...dialogProps}
        >
          {inner}
        </form>
      ) : (
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className={containerCls}
          {...dialogProps}
        >
          {inner}
        </div>
      )}

      {pendingClose && dirtyConfirmMessage && onClose && (
        <ConfirmDialog
          message={dirtyConfirmMessage}
          onCancel={() => setPendingClose(false)}
          onConfirm={() => {
            setPendingClose(false)
            onClose()
          }}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [])

  return (
    <div
      className="absolute inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
    >
      <div
        ref={ref}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-bg-overlay/98 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
      >
        <h3 id={titleId} className="mb-3 font-semibold text-white">Confirmer</h3>
        <p className="mb-5 text-white/70">{message}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onCancel} variant="outline">Annuler</Button>
          <Button type="button" onClick={onConfirm} variant="outline" outlineWeight="strong" tone="danger" active>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}
