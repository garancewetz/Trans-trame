import type { ReactNode } from 'react'
import { MousePointerClick } from 'lucide-react'

type EmptyStateProps = {
  /** Main short message. Defaults to the side-panel default. */
  title?: ReactNode
  /** Optional longer hint. */
  description?: ReactNode
  /** Optional icon override. Defaults to a cursor icon; pass `null` to hide. */
  icon?: ReactNode | null
  /** Optional CTA rendered below the text. */
  action?: ReactNode
}

export function EmptyState({
  title = 'Cliquez sur un nœud ou un lien pour explorer',
  description,
  icon,
  action,
}: EmptyStateProps) {
  const resolvedIcon =
    icon === null
      ? null
      : icon ?? <MousePointerClick size={28} className="text-text-dimmed" aria-hidden />

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
      role="status"
    >
      {resolvedIcon}
      <p className="text-[1rem] text-text-soft">{title}</p>
      {description && <p className="text-label text-text-secondary">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
