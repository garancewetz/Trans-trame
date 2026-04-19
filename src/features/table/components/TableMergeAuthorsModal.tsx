import { Merge } from 'lucide-react'
import type { Author, AuthorId, Book } from '@/types/domain'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { RadioCard } from '@/common/components/ui/RadioCard'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'
import { authorName } from '@/common/utils/authorUtils'

type Props = {
  open: boolean
  authorsToMerge: Author[]
  keepId: AuthorId | null
  setKeepId: (id: AuthorId) => void
  confirm: boolean
  setConfirm: (v: boolean) => void
  onConfirm: () => void
  onClose?: () => void
  bookCountByAuthor?: Map<AuthorId, number>
  booksByAuthor?: Map<AuthorId, Book[]>
}

export function TableMergeAuthorsModal({
  open,
  authorsToMerge,
  keepId,
  setKeepId,
  confirm,
  setConfirm,
  onConfirm,
  onClose,
  bookCountByAuthor,
  booksByAuthor,
}: Props) {
  if (!open || (authorsToMerge || []).length !== 2) return null

  return (
    <Modal
      open={open}
      title="Fusionner deux auteur·ices"
      subtitle="L'auteur·ice non conservé·e sera supprimé·e. Ses ressources seront transférées vers l'auteur·ice conservé·e."
      footer={
        <>
          <Button
            type="button"
            onClick={() => { onClose?.(); setConfirm(false) }}
            variant="surface"
          >
            Annuler
          </Button>
          <ConfirmButton
            confirmed={confirm}
            onClick={onConfirm}
            tone="merge"
            icon={<Merge size={12} />}
            label="Fusionner"
            confirmLabel="Confirmer la fusion"
            disabled={!keepId}
          />
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-2">
        {authorsToMerge.map((a) => {
          const books = booksByAuthor?.get?.(a.id) || []
          const booksCount = bookCountByAuthor?.get?.(a.id) ?? books.length
          return (
            <RadioCard
              key={a.id}
              checked={keepId === a.id}
              onChange={() => { setKeepId(a.id); setConfirm(false) }}
            >
              <strong className="block font-mono text-body text-white">
                {authorName(a)}
              </strong>
              <span className="font-mono text-[0.8rem] text-white/40">
                {a.lastName ? a.lastName.toUpperCase() : '—'}{a.firstName ? `, ${a.firstName}` : ''}
              </span>
              <span className="ml-2 font-mono text-caption text-white/28">
                · {booksCount} ressource{booksCount > 1 ? 's' : ''}
              </span>
              {books.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5 font-mono text-caption text-white/45">
                  {books.map((b) => (
                    <li key={b.id} className="flex items-baseline gap-1.5">
                      <span className="text-white/30">·</span>
                      <span className="text-white/70">{b.title || '(sans titre)'}</span>
                      {b.year != null && (
                        <span className="text-white/28">({b.year})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </RadioCard>
          )
        })}
      </div>

      <p className="mb-4 text-[0.8rem] text-white/28">
        Conserver :{' '}
        <strong className="text-white/55">
          {(() => {
            const kept = authorsToMerge.find((a) => a.id === keepId)
            return kept ? authorName(kept) : '—'
          })()}
        </strong>
      </p>
    </Modal>
  )
}
