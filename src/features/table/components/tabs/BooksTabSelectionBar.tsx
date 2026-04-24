import { BookOpen, ClipboardCopy, Info, Merge, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/common/components/ui/Button'
import { Tooltip } from '@/common/components/ui/Tooltip'

type Props = {
  selectedCount: number
  bulkDeleteConfirm: boolean
  onBulkDelete: () => void
  onBulkDeleteBlur: () => void
  onCancelSelection: () => void
  showMerge: boolean
  showSameWork: boolean
  onOpenMergeModal: () => void
  onOpenSameWorkModal: () => void
  onExport: () => string
  onAIEnrich?: () => void
  onShowInfo?: () => void
}

export function BooksTabSelectionBar({
  selectedCount,
  bulkDeleteConfirm,
  onBulkDelete,
  onBulkDeleteBlur,
  onCancelSelection,
  showMerge,
  showSameWork,
  onOpenMergeModal,
  onOpenSameWorkModal,
  onExport,
  onAIEnrich,
  onShowInfo,
}: Props) {
  const [copied, setCopied] = useState(false)

  if (selectedCount === 0) return null

  const handleExport = async () => {
    const text = onExport()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border-subtle bg-white/1.5 px-5 py-2">
      <span className="font-mono text-label text-text-soft">
        {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
      </span>
      {showSameWork && (
        <Tooltip content="Regrouper des traductions ou éditions d'une même œuvre (les ressources restent séparés en base)">
          <Button
            type="button"
            onClick={onOpenSameWorkModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet/30 bg-violet/[0.07] px-3 py-1.5 text-[0.8rem] font-semibold text-violet/75 transition-all hover:bg-violet/[0.14]"
          >
            <BookOpen size={12} /> Même œuvre
          </Button>
        </Tooltip>
      )}
      {showMerge && (
        <Tooltip content="Supprimer un doublon en transférant ses liens vers la ressource conservée (irréversible)">
          <Button
            type="button"
            onClick={onOpenMergeModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber/30 bg-amber/[0.07] px-3 py-1.5 text-[0.8rem] font-semibold text-amber/75 transition-all hover:bg-amber/[0.14]"
          >
            <Merge size={12} /> Dédoublonner
          </Button>
        </Tooltip>
      )}
      <Button
        type="button"
        onClick={handleExport}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan/25 bg-cyan/5 px-3 py-1.5 text-[0.8rem] font-semibold text-cyan/65 transition-all hover:bg-cyan/12"
      >
        <ClipboardCopy size={11} />
        {copied ? 'Copié !' : `Copier texte (${selectedCount})`}
      </Button>
      {onShowInfo && (
        <Tooltip content="Date d'ajout et éléments importés au même moment">
          <Button
            type="button"
            onClick={onShowInfo}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/4 px-3 py-1.5 text-[0.8rem] font-semibold text-text-soft transition-all hover:bg-white/8"
          >
            <Info size={11} /> Informations
          </Button>
        </Tooltip>
      )}
      {onAIEnrich && (
        <Tooltip content="Enrichir les ressources sélectionnées via Gemini (catégories, édition, année…)">
          <Button
            type="button"
            onClick={() => onAIEnrich()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan/25 bg-cyan/5 px-3 py-1.5 text-[0.8rem] font-semibold text-cyan/65 transition-all hover:bg-cyan/12"
          >
            <Sparkles size={11} /> AI ({selectedCount})
          </Button>
        </Tooltip>
      )}
      <Button
        type="button"
        onClick={onBulkDelete}
        onBlur={onBulkDeleteBlur}
        className={[
          'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.8rem] font-semibold transition-all',
          bulkDeleteConfirm
            ? 'border-red/[0.55] bg-red/10 text-red/90'
            : 'border-red/22 text-red/55 hover:bg-red/[0.07]',
        ].join(' ')}
      >
        <Trash2 size={11} />
        {bulkDeleteConfirm ? `Confirmer (${selectedCount})` : `Supprimer (${selectedCount})`}
      </Button>
      <Button
        type="button"
        onClick={onCancelSelection}
        className="cursor-pointer text-[0.8rem] text-text-dimmed hover:text-white/60"
      >
        Annuler
      </Button>
    </div>
  )
}
