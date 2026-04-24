import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './Button'

type PanelHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  /** Additional actions rendered between the subtitle block and the close button */
  actions?: ReactNode
  onClose?: () => void
  closeLabel?: string
  className?: string
}

/**
 * Standard header for side panels (AnalysisPanel, AuthorsPanel, etc.).
 * Replaces the copy/pasted header markup with a single API.
 */
export function PanelHeader({
  title,
  subtitle,
  actions,
  onClose,
  closeLabel = 'Fermer',
  className,
}: PanelHeaderProps) {
  return (
    <div className={clsx('mb-4 flex shrink-0 items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[1rem] font-semibold text-white/90">{title}</h2>
        {subtitle && <p className="text-[0.8rem] text-white/40">{subtitle}</p>}
      </div>
      {(actions || onClose) && (
        <div className="flex items-center gap-2">
          {actions}
          {onClose && (
            <Button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
              className="cursor-pointer rounded-lg border border-border-default bg-white/5 p-2 text-white/40 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
