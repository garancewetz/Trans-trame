import type { Author } from '@/types/domain'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'
import { authorName } from '@/common/utils/authorUtils'

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
      <div className="mb-4 max-h-[min(40vh,320px)] overflow-y-auto rounded-xl border border-white/8 text-[0.8rem]">
        {duplicateGroups.map((group, i) => (
          <div key={i} className="border-b border-white/6 px-3 py-2 last:border-0">
            <div className="mb-1 text-[0.72rem] uppercase tracking-wide text-white/25">
              Groupe {i + 1} — {group.length} entrées → conserve la 1ère
            </div>
            {group.map((author, j) => (
              <div
                key={author.id}
                className={[
                  'flex items-center gap-2 rounded px-2 py-0.5 font-mono',
                  j === 0
                    ? 'bg-green/6 text-white/80'
                    : 'text-white/40 line-through decoration-white/15',
                ].join(' ')}
              >
                <span className={j === 0 ? 'text-green/60 text-[0.7rem]' : 'text-red/40 text-[0.7rem]'}>
                  {j === 0 ? '✓' : '✗'}
                </span>
                <span>{author.firstName || ''}</span>
                <span className="font-semibold">{(author.lastName || '').toUpperCase()}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}
