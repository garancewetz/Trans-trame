import { useState, useEffect, useMemo } from 'react'
import { Check } from 'lucide-react'
import type { Author, AuthorId, Book } from '@/types/domain'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'

type Props = {
  open: boolean
  duplicateGroups: Author[][]
  handleMergeDupes: (
    choices: Map<number, AuthorId>,
    excluded: Map<number, Set<AuthorId>>,
  ) => void
  nodes: Book[]
  confirm: boolean
  setOpen: (v: boolean) => void
  setConfirm: (v: boolean) => void
}

export function TableAuthorDedupeModal({
  open,
  duplicateGroups,
  handleMergeDupes,
  nodes,
  confirm,
  setOpen,
  setConfirm,
}: Props) {
  const [choices, setChoices] = useState<Map<number, AuthorId>>(new Map())
  const [excluded, setExcluded] = useState<Map<number, Set<AuthorId>>>(new Map())

  // Initialize choices: default to the first author in each group
  useEffect(() => {
    if (!open) return
    const init = new Map<number, AuthorId>()
    duplicateGroups.forEach((group, i) => {
      if (group.length > 0) init.set(i, group[0].id)
    })
    setChoices(init)
    setExcluded(new Map())
  }, [open, duplicateGroups])

  const bookCountById = useMemo(() => {
    const m = new Map<AuthorId, number>()
    ;(nodes || []).forEach((b) => {
      ;(b.authorIds || []).forEach((aid) => m.set(aid, (m.get(aid) || 0) + 1))
    })
    return m
  }, [nodes])

  const totalToRemove = (duplicateGroups || []).reduce((acc, g, i) => {
    const keepId = choices.get(i)
    const excludedSet = excluded.get(i)
    const toMerge = g.filter(
      (a) => a.id !== keepId && !(excludedSet && excludedSet.has(a.id)),
    ).length
    return acc + toMerge
  }, 0)

  const handleClose = () => {
    setOpen(false)
    setConfirm(false)
  }

  const selectAuthor = (groupIndex: number, authorId: AuthorId) => {
    setChoices((prev) => {
      const next = new Map(prev)
      next.set(groupIndex, authorId)
      return next
    })
    // Si le nouveau keep était exclu, on le réintègre (un keep ne peut pas être exclu)
    setExcluded((prev) => {
      const set = prev.get(groupIndex)
      if (!set || !set.has(authorId)) return prev
      const next = new Map(prev)
      const nextSet = new Set(set)
      nextSet.delete(authorId)
      next.set(groupIndex, nextSet)
      return next
    })
    setConfirm(false)
  }

  const toggleExcluded = (groupIndex: number, authorId: AuthorId) => {
    setExcluded((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(groupIndex) || [])
      if (set.has(authorId)) set.delete(authorId)
      else set.add(authorId)
      next.set(groupIndex, set)
      return next
    })
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
          supprimer).{' '}
          <span className="text-white/50">
            Cliquez pour conserver · décochez pour exclure.
          </span>
        </>
      }
      footer={
        <>
          <Button type="button" onClick={handleClose} variant="surface">
            Annuler
          </Button>
          <ConfirmButton
            confirmed={confirm}
            onClick={() => handleMergeDupes(choices, excluded)}
            label="Fusionner les doublons"
            confirmLabel={`Confirmer (−${totalToRemove})`}
          />
        </>
      }
    >
      <div className="mb-4 max-h-[min(50vh,420px)] overflow-y-auto rounded-xl border border-white/8 bg-white/1.5 text-[0.8rem] backdrop-blur-sm">
        {duplicateGroups.map((group, i) => {
          const keepId = choices.get(i)
          return (
            <div key={i} className="border-b border-white/5 px-3 py-2.5 last:border-0">
              <div className="mb-1.5 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.15em] text-white/30">
                <span>Groupe {i + 1}</span>
                <span className="h-px flex-1 bg-white/8" />
                <span>{group.length} entrées</span>
              </div>
              <div className="flex flex-col gap-1">
                {group.map((author) => {
                  const isKept = author.id === keepId
                  const isExcluded = !isKept && !!excluded.get(i)?.has(author.id)
                  const booksCount = bookCountById.get(author.id) || 0
                  const rowClasses = isKept
                    ? 'border-green/25 bg-green/[0.06]'
                    : isExcluded
                    ? 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/[0.02]'
                    : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                  const checkboxClasses = isKept
                    ? 'border-green/50 bg-green/20 text-green cursor-not-allowed'
                    : isExcluded
                    ? 'border-white/15 text-transparent hover:border-white/35'
                    : 'border-green/55 bg-green/12 text-green hover:border-green/75'
                  const nameClasses = isKept
                    ? 'text-white/90'
                    : isExcluded
                    ? 'text-white/30'
                    : 'text-white/55 line-through decoration-white/15'
                  return (
                    <div
                      key={author.id}
                      className={[
                        'flex items-center gap-3 rounded-lg border px-2.5 py-1.5 font-mono transition-all',
                        rowClasses,
                      ].join(' ')}
                    >
                      <Button
                        type="button"
                        onClick={() => toggleExcluded(i, author.id)}
                        disabled={isKept}
                        aria-label={`${isExcluded ? 'Inclure' : 'Exclure'} ${author.firstName || ''} ${author.lastName || ''} de la fusion`}
                        className={[
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                          checkboxClasses,
                        ].join(' ')}
                      >
                        <Check size={9} strokeWidth={3} />
                      </Button>
                      <button
                        type="button"
                        onClick={() => selectAuthor(i, author.id)}
                        className="flex flex-1 cursor-pointer items-center gap-2 text-left"
                      >
                        <span className={['flex flex-1 items-center gap-1.5', nameClasses].join(' ')}>
                          <span>{author.firstName || ''}</span>
                          <span className="font-semibold">{(author.lastName || '').toUpperCase()}</span>
                        </span>
                        {isKept && (
                          <span className="rounded-sm bg-green/15 px-1.5 py-px text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-green/80">
                            Conservé
                          </span>
                        )}
                        <span className="text-[0.68rem] text-white/25">
                          {booksCount} ouvrage{booksCount !== 1 ? 's' : ''}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
