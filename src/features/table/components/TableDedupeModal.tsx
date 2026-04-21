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
          de doublons détectés ({totalToRemove} ressource{totalToRemove > 1 ? 's' : ''} à
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
          const sharedOriginalTitle = isCanonical
            ? group.books.find((b) => String(b.originalTitle ?? '').trim())?.originalTitle?.trim() ||
              String(ref.originalTitle ?? '').trim() ||
              null
            : null
          return (
            <div key={ref.id} className="border-b border-white/5 px-3 py-2 last:border-0">
              {isCanonical ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-1.5 py-px text-[0.6rem] font-medium uppercase tracking-wide text-cyan-200/80"
                      title="Regroupement par titre original (œuvre) — éditions ou traductions possibles"
                    >
                      via œuvre
                    </span>
                    <span className="text-white/30">×{group.books.length}</span>
                  </div>
                  {sharedOriginalTitle ? (
                    <div className="mt-1.5 leading-snug">
                      <span className="text-[0.65rem] font-medium uppercase tracking-wide text-white/35">
                        Titre original (œuvre)
                      </span>
                      <div className="mt-0.5 font-mono text-label text-cyan-100/90">
                        « {sharedOriginalTitle} »
                      </div>
                      <p className="mt-1 text-[0.68rem] leading-relaxed text-white/40">
                        Les titres ci-dessous sont des titres d’édition ou de traduction ; le regroupement
                        vient de ce titre canonique commun.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[0.7rem] text-amber-200/70">
                      Même clé d’œuvre en base, mais le champ titre original est vide sur ces entrées —
                      vérifie les fiches ou le dernier import.
                    </p>
                  )}
                  <ul className="mt-2 space-y-1 border-l border-white/10 pl-2.5">
                    {group.books.map((b) => (
                      <li key={b.id} className="text-micro">
                        <span className="text-white/75">{b.title}</span>
                        {b.year != null && (
                          <span className="ml-1.5 font-mono text-[0.65rem] text-white/35">{b.year}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-white/70">{ref.title}</span>
                    <span className="text-white/30">×{group.books.length}</span>
                  </div>
                  <p className="mt-1 text-[0.68rem] text-white/35">
                    Même titre affiché et même auteur — doublon strict.
                  </p>
                  {group.books.some((b) => String(b.originalTitle ?? '').trim()) && (
                    <div className="mt-1.5 text-micro text-white/45">
                      <span className="text-white/30">Titre original (si renseigné) : </span>
                      <span className="font-mono text-white/60">
                        « {String(ref.originalTitle ?? '').trim() || '—'} »
                      </span>
                      {group.books.length > 1 &&
                        group.books.slice(1).some(
                          (b) =>
                            String(b.originalTitle ?? '').trim() !==
                            String(ref.originalTitle ?? '').trim(),
                        ) && (
                          <span className="ml-1 text-white/30">
                            (plusieurs valeurs — ouvre le détail de chaque fiche)
                          </span>
                        )}
                    </div>
                  )}
                </>
              )}
              {isCanonical ? (
                author ? (
                  <div className="mt-2 text-[0.7rem] text-white/40">{author}</div>
                ) : null
              ) : (author || ref.year) ? (
                <div className="mt-2 text-[0.7rem] text-white/40">
                  {author && <span>{author}</span>}
                  {author && ref.year ? <span className="mx-1.5 text-white/20">·</span> : null}
                  {ref.year && <span>{ref.year}</span>}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
