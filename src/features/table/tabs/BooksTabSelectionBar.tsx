import { Merge, Trash2 } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'

type Props = {
  selectedCount: number
  bulkDeleteConfirm: boolean
  onBulkDelete: () => void
  onBulkDeleteBlur: () => void
  onCancelSelection: () => void
  showMerge: boolean
  onOpenMergeModal: () => void
}

export function BooksTabSelectionBar({
  selectedCount,
  bulkDeleteConfirm,
  onBulkDelete,
  onBulkDeleteBlur,
  onCancelSelection,
  showMerge,
  onOpenMergeModal,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/6 bg-white/1.5 px-5 py-2">
      <span className="font-mono text-[0.72rem] text-white/45">
        {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
      </span>
      {showMerge && (
        <Button
          type="button"
          onClick={onOpenMergeModal}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(255,200,60,0.3)] bg-[rgba(255,200,60,0.07)] px-3 py-1.5 text-[0.7rem] font-semibold text-[rgba(255,210,100,0.75)] transition-all hover:bg-[rgba(255,200,60,0.14)]"
        >
          <Merge size={12} /> Fusionner
        </Button>
      )}
      <Button
        type="button"
        onClick={onBulkDelete}
        onBlur={onBulkDeleteBlur}
        className={[
          'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all',
          bulkDeleteConfirm
            ? 'border-[rgba(255,70,70,0.55)] bg-[rgba(255,70,70,0.1)] text-[rgba(255,120,120,0.9)]'
            : 'border-[rgba(255,70,70,0.22)] text-[rgba(255,90,90,0.55)] hover:bg-[rgba(255,70,70,0.07)]',
        ].join(' ')}
      >
        <Trash2 size={11} />
        {bulkDeleteConfirm ? `Confirmer (${selectedCount})` : `Supprimer (${selectedCount})`}
      </Button>
      <Button
        type="button"
        onClick={onCancelSelection}
        className="cursor-pointer text-[0.7rem] text-white/25 hover:text-white/60"
      >
        Annuler
      </Button>
    </div>
  )
}
