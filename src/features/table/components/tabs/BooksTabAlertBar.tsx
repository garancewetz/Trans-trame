import { ClipboardList, Merge, Sparkles } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import type { Book } from '@/types/domain'
import type { DuplicateGroup } from '../../hooks/useTableViewDuplicateDerived'

type Props = {
  duplicateGroups: DuplicateGroup[]
  orphans: Book[]
  todoCount: number
  todoOnly: boolean
  onToggleTodoOnly: () => void
  onOpenDedupeModal?: () => void
  onOpenOrphanModal?: () => void
}

export function BooksTabAlertBar({
  duplicateGroups,
  orphans,
  todoCount,
  todoOnly,
  onToggleTodoOnly,
  onOpenDedupeModal,
  onOpenOrphanModal,
}: Props) {
  if (duplicateGroups.length === 0 && orphans.length === 0 && todoCount === 0) {
    return null
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-5 py-2">
      {todoCount > 0 && (
        <Button
          variant={todoOnly ? 'solid' : 'outline'}
          outlineWeight="faint"
          tone="amber"
          emphasis
          icon={<ClipboardList size={11} />}
          onClick={onToggleTodoOnly}
          type="button"
          title={todoOnly ? 'Afficher tous les livres' : `${todoCount} élément${todoCount > 1 ? 's' : ''} à traiter`}
        >
          À traiter
          <span className="tabular-nums">({todoCount})</span>
        </Button>
      )}
      {duplicateGroups.length > 0 && (
        <Button
          variant="outline"
          outlineWeight="faint"
          tone="warning"
          emphasis
          icon={<Merge size={11} />}
          onClick={onOpenDedupeModal}
          type="button"
          title={`${duplicateGroups.length} groupe${duplicateGroups.length > 1 ? 's' : ''} de doublons`}
        >
          Doublons
          <span className="tabular-nums">({duplicateGroups.length})</span>
        </Button>
      )}
      {orphans.length > 0 && (
        <Button
          variant="outline"
          outlineWeight="faint"
          tone="orphan"
          emphasis
          icon={<Sparkles size={11} />}
          onClick={onOpenOrphanModal}
          type="button"
          title={`${orphans.length} ressource${orphans.length > 1 ? 's' : ''} sans lien`}
        >
          Orphelins
          <span className="tabular-nums">({orphans.length})</span>
        </Button>
      )}
    </div>
  )
}
