import type { Author } from '@/types/domain'
import { useMemo } from 'react'
import { bookAuthorDisplay, buildAuthorsMap } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'
import type { DuplicateGroup } from '../hooks/useTableViewDuplicateDerived'

type Props = {
  dedupeModal: boolean
  duplicateGroups: DuplicateGroup[]
  authors: Author[]
  handleCleanDupes: () => void
  dedupeConfirm: boolean
  setDedupeModal: (v: boolean) => void
  setDedupeConfirm: (v: boolean) => void
}

export function TableDedupeModal({
  dedupeModal,
  duplicateGroups,
  authors,
  handleCleanDupes,
  dedupeConfirm,
  setDedupeModal,
  setDedupeConfirm,
}: Props) {
  const authorsMap = useMemo(() => buildAuthorsMap(authors), [authors])
  const totalToRemove = duplicateGroups.reduce((acc, g) => acc + g.books.length - 1, 0)

  const handleClose = () => {
    setDedupeModal(false)
    setDedupeConfirm(false)
  }

  return (
    <Modal
      open={dedupeModal}
      title="Dédoublonner"
      onClose={handleClose}
      zIndex="z-60"
      subtitle={
        <>
          <span className="font-semibold text-white">
            {duplicateGroups.length} groupe{duplicateGroups.length > 1 ? 's' : ''}
          </span>{' '}
          de doublons détectés ({totalToRemove} ouvrage{totalToRemove > 1 ? 's' : ''} à
          supprimer). Le plus riche de chaque groupe sera conservé, ses liens préservés.
        </>
      }
      footer={
        <>
          <Button type="button" onClick={handleClose} variant="surface">
            Annuler
          </Button>
          <ConfirmButton
            confirmed={dedupeConfirm}
            onClick={handleCleanDupes}
            label="Fusionner les doublons"
            confirmLabel={`Confirmer (−${totalToRemove})`}
          />
        </>
      }
    >
      <div className="mb-4 max-h-[min(40vh,320px)] overflow-y-auto rounded-xl border border-white/8 text-[0.8rem]">
        {duplicateGroups.map((group) => {
          const ref = group.books[0]
          const author = bookAuthorDisplay(ref, authorsMap)
          const isCanonical = group.kind === 'canonical'
          return (
            <div key={ref.id} className="border-b border-white/5 px-3 py-2 last:border-0">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-white/70">{ref.title}</span>
                <span className="text-white/30">×{group.books.length}</span>
                {isCanonical && (
                  <span
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-1.5 py-px text-[0.6rem] font-medium uppercase tracking-wide text-cyan-200/80"
                    title={`Même œuvre selon le titre original « ${ref.originalTitle} » — peut-être deux éditions ou traductions`}
                  >
                    via œuvre
                  </span>
                )}
              </div>
              {(author || ref.year) && (
                <div className="mt-0.5 text-[0.7rem] text-white/40">
                  {author && <span>{author}</span>}
                  {author && ref.year ? <span className="mx-1.5 text-white/20">·</span> : null}
                  {ref.year && <span>{ref.year}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
