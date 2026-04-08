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
      subtitle="L'ouvrage non conservé sera définitivement supprimé. Ses citations et liens seront transférés vers l'ouvrage conservé."
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
              <strong className="block font-mono text-[0.92rem] text-white">{n.title}</strong>
              <span className="font-mono text-[0.8rem] text-white/40">
                {authorDisplay}{n.year ? `, ${n.year}` : ''}
              </span>
              <span className="ml-2 font-mono text-[0.75rem] text-white/28">
                · {bookCount} ouvrage{bookCount > 1 ? 's' : ''}
              </span>
            </RadioCard>
          )
        })}
      </div>

      <p className="mb-4 text-[0.8rem] text-white/28">
        Conserver :{' '}
        <strong className="text-white/55">
          {(() => {
            const kept = mergeNodes.find((n) => n.id === mergeKeepId)
            return kept ? bookAuthorDisplay(kept, authorsMap) : '—'
          })()}
        </strong>
      </p>
    </Modal>
  )
}
