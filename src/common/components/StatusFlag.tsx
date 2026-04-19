import clsx from 'clsx'
import { Flag } from 'lucide-react'
import type { EntityStatus } from '@/types/domain'

/**
 * Petit drapeau de statut pour ressources et auteur·ices.
 *  - status 'warning' : drapeau amber visible en permanence ; clic = marquer vérifié·e (status null)
 *  - status null      : drapeau ghost qui n'apparaît qu'au survol de la ligne ; clic = poser warning
 *
 * Le composant s'attend à être placé dans une ligne de table dont le hover est piloté par le
 * groupe Tailwind `group` (déjà en place sur AuthorTableRow et BooksTabBookRow).
 */
export function StatusFlag({
  status,
  onChange,
  size = 11,
}: {
  status: EntityStatus | undefined
  onChange: (next: EntityStatus) => void
  size?: number
}) {
  const isWarning = status === 'warning'
  const label = isWarning ? 'Marquer comme vérifié·e' : 'Marquer pour vérification'
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isWarning}
      onClick={(e) => {
        e.stopPropagation()
        onChange(isWarning ? null : 'warning')
      }}
      className={clsx(
        'ml-1.5 inline-flex shrink-0 cursor-pointer items-center transition-opacity',
        isWarning
          ? 'text-amber/80 hover:text-amber'
          : 'text-white/25 opacity-0 group-hover:opacity-100 hover:text-amber/70',
      )}
    >
      <Flag size={size} className={isWarning ? 'fill-amber/40' : ''} />
    </button>
  )
}
