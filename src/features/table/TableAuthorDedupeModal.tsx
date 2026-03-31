import type { Author } from '@/domain/types'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'
import { authorName } from '@/lib/authorUtils'

type Props = {
  open: boolean
  duplicateGroups: Author[][]
  handleMergeDupes: () => void
  confirm: boolean
  setOpen: (v: boolean) => void
  setConfirm: (v: boolean) => void
}

export function TableAuthorDedupeModal({
  open,
  duplicateGroups,
  handleMergeDupes,
  confirm,
  setOpen,
  setConfirm,
}: Props) {
  const totalToRemove = (duplicateGroups || []).reduce((acc, g) => acc + g.length - 1, 0)

  const handleClose = () => {
    setOpen(false)
    setConfirm(false)
  }

  return (
    <Modal
      open={open}
      title="Fusionner les doublons d'auteur·ices"
      onClose={handleClose}
      zIndex="z-60"
      subtitle={
        <>
          <span className="font-semibold text-white">
            {duplicateGroups.length} groupe{duplicateGroups.length > 1 ? 's' : ''}
          </span>{' '}
          de doublons détectés ({totalToRemove} auteur·ice{totalToRemove > 1 ? 's' : ''} à
          supprimer). Les ouvrages seront transférés vers l'auteur·ice conservé·e.
        </>
      }
      footer={
        <>
          <Button type="button" onClick={handleClose} variant="surface">
            Annuler
          </Button>
          <ConfirmButton
            confirmed={confirm}
            onClick={handleMergeDupes}
            label="Fusionner les doublons"
            confirmLabel={`Confirmer (−${totalToRemove})`}
          />
        </>
      }
    >
      <div className="mb-4 max-h-[min(40vh,320px)] overflow-y-auto rounded-xl border border-white/8 text-[0.7rem]">
        {duplicateGroups.map((group, i) => (
          <div key={i} className="border-b border-white/5 px-3 py-2 last:border-0">
            <span className="font-mono text-white/70">{authorName(group[0])}</span>
            <span className="ml-2 text-white/30">×{group.length}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
