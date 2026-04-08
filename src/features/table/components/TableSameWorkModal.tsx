import { BookOpen } from 'lucide-react'
import type { Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { RadioCard } from '@/common/components/ui/RadioCard'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'

type Props = {
  open: boolean
  books: Book[]
  authorsMap: Map<string, AuthorNode>
  selectedTitle: string | null
  setSelectedTitle: (title: string) => void
  confirm: boolean
  setConfirm: (v: boolean) => void
  onConfirm: () => void
  onClose: () => void
}

export function TableSameWorkModal({
  open,
  books,
  authorsMap,
  selectedTitle,
  setSelectedTitle,
  confirm,
  setConfirm,
  onConfirm,
  onClose,
}: Props) {
  if (!open || books.length < 2) return null

  return (
    <Modal
      open={open}
      title="Même œuvre"
      subtitle="Ces ouvrages sont des traductions ou éditions d'une même œuvre. Choisis le titre original."
      footer={
        <>
          <Button type="button" onClick={onClose} variant="surface">
            Annuler
          </Button>
          <ConfirmButton
            confirmed={confirm}
            onClick={onConfirm}
            tone="merge"
            icon={<BookOpen size={12} />}
            label="Regrouper"
            confirmLabel="Confirmer"
            disabled={!selectedTitle}
          />
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-2">
        {books.map((b) => {
          const authorDisplay = bookAuthorDisplay(b, authorsMap)
          return (
            <RadioCard
              key={b.id}
              checked={selectedTitle === b.title}
              onChange={() => { setSelectedTitle(b.title); setConfirm(false) }}
            >
              <strong className="block font-mono text-[0.92rem] text-white">{b.title}</strong>
              <span className="font-mono text-[0.8rem] text-white/40">
                {authorDisplay}{b.year ? `, ${b.year}` : ''}
              </span>
            </RadioCard>
          )
        })}
      </div>

      <p className="text-[0.8rem] text-white/28">
        Titre original :{' '}
        <strong className="text-white/55">
          {selectedTitle || '—'}
        </strong>
      </p>
      <p className="mt-1 text-[0.75rem] text-white/20">
        Tous les ouvrages ci-dessus recevront ce titre original et seront regroupés en un seul nœud dans le graphe. Chaque ouvrage reste une entrée séparée en base.
      </p>
    </Modal>
  )
}
