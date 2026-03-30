import type { Book } from '@/domain/types'
import type { AuthorNode } from '@/lib/authorUtils'
import { bookAuthorDisplay } from '@/lib/authorUtils'
import { axesGradient } from '@/lib/categories'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmButton from '../../components/ui/ConfirmButton'

type Props = {
  orphanModal: boolean
  orphans: Book[]
  authorsMap: Map<string, AuthorNode>
  handleCleanOrphans: () => void
  orphanConfirm: boolean
  setOrphanModal: (v: boolean) => void
  setOrphanConfirm: (v: boolean) => void
}

export default function TableOrphanModal({
  orphanModal,
  orphans,
  authorsMap,
  handleCleanOrphans,
  orphanConfirm,
  setOrphanModal,
  setOrphanConfirm,
}: Props) {
  const handleClose = () => {
    setOrphanModal(false)
    setOrphanConfirm(false)
  }

  return (
    <Modal
      open={orphanModal}
      title="Ouvrages orphelins"
      subtitle={`${orphans.length} ouvrage${orphans.length > 1 ? 's' : ''} sans aucun lien dans la galaxie.`}
      footer={
        <>
          <Button type="button" onClick={handleClose} variant="surface">
            Annuler
          </Button>
          <ConfirmButton
            confirmed={orphanConfirm}
            onClick={handleCleanOrphans}
            label="Nettoyer"
            confirmLabel={`Supprimer (${orphans.length})`}
          />
        </>
      }
    >
      <div className="mb-4 max-h-[min(50vh,360px)] overflow-y-auto rounded-xl border border-white/8 bg-white/2.5 p-2">
        {orphans.map((n) => (
          <div key={n.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
            <span>
              <strong className="block font-mono text-[0.78rem] text-white">{n.title}</strong>
              <span className="font-mono text-[0.65rem] text-white/32">
                {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
