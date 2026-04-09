import type { Book } from '@/types/domain'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'

type Props = {
  dedupeModal: boolean
  duplicateGroups: Book[][]
  handleCleanDupes: () => void
  dedupeConfirm: boolean
  setDedupeModal: (v: boolean) => void
  setDedupeConfirm: (v: boolean) => void
}

export function TableDedupeModal({
  dedupeModal,
  duplicateGroups,
  handleCleanDupes,
  dedupeConfirm,
  setDedupeModal,
  setDedupeConfirm,
}: Props) {
  const totalToRemove = duplicateGroups.reduce((acc, g) => acc + g.length - 1, 0)

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
        {duplicateGroups.map((group) => (
          <div key={group[0].id} className="border-b border-white/5 px-3 py-2 last:border-0">
            <span className="font-mono text-white/70">{group[0].title}</span>
            <span className="ml-2 text-white/30">×{group.length}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
