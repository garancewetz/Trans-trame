import { Merge } from 'lucide-react'
import type { Book, BookId } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { RadioCard } from '@/common/components/ui/RadioCard'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'

type Props = {
  mergeModal: boolean
  mergeNodes: Book[]
  nodes: Book[]
  authorsMap: Map<string, AuthorNode>
  mergeKeepId: BookId | null
  setMergeKeepId: (id: BookId) => void
  setMergeConfirm: (v: boolean) => void
  mergeConfirm: boolean
  handleConfirmMerge: () => void
  setMergeModal: (v: boolean) => void
}

export function TableMergeModal({
  mergeModal,
  mergeNodes,
  nodes,
  authorsMap,
  mergeKeepId,
  setMergeKeepId,
  setMergeConfirm,
  mergeConfirm,
  handleConfirmMerge,
  setMergeModal,
}: Props) {
  if (!mergeModal || mergeNodes.length !== 2) return null

  return (
    <Modal
      open={mergeModal}
      title="Dédoublonner"
      subtitle="La ressource non conservée sera définitivement supprimée. Ses citations et liens seront transférées vers la ressource conservée."
      footer={
        <>
          <Button
            type="button"
            onClick={() => { setMergeModal(false); setMergeConfirm(false) }}
            variant="surface"
          >
            Annuler
          </Button>
          <ConfirmButton
            confirmed={mergeConfirm}
            onClick={handleConfirmMerge}
            tone="merge"
            icon={<Merge size={12} />}
            label="Fusionner"
            confirmLabel="Confirmer la fusion"
            disabled={!mergeKeepId}
          />
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-2">
        {mergeNodes.map((n) => {
          const authorDisplay = bookAuthorDisplay(n, authorsMap)
          const bookCount = nodes.filter(
            (x) => bookAuthorDisplay(x, authorsMap).toLowerCase() === authorDisplay.toLowerCase()
          ).length
          return (
            <RadioCard
              key={n.id}
              checked={mergeKeepId === n.id}
              onChange={() => { setMergeKeepId(n.id); setMergeConfirm(false) }}
            >
              <strong className="block font-mono text-body text-white">{n.title}</strong>
              <span className="font-mono text-[0.8rem] text-white/40">
                {authorDisplay}{n.year ? `, ${n.year}` : ''}
              </span>
              <span className="ml-2 font-mono text-caption text-white/28">
                · {bookCount} ressource{bookCount > 1 ? 's' : ''}
              </span>
            </RadioCard>
          )
        })}
      </div>

      <p className="mb-4 text-[0.8rem] text-white/28">
        Conserver :{' '}
        <strong className="text-text-soft">
          {(() => {
            const kept = mergeNodes.find((n) => n.id === mergeKeepId)
            return kept ? bookAuthorDisplay(kept, authorsMap) : '—'
          })()}
        </strong>
      </p>
    </Modal>
  )
}
