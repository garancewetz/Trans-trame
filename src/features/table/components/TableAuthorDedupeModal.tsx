import { useState, useEffect, useMemo } from 'react'
import type { Author, AuthorId, Book } from '@/types/domain'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'

type Props = {
  open: boolean
  duplicateGroups: Author[][]
  handleMergeDupes: (choices: Map<number, AuthorId>) => void
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

  // Initialize choices: default to the first author in each group
  useEffect(() => {
    if (!open) return
    const init = new Map<number, AuthorId>()
    duplicateGroups.forEach((group, i) => {
      if (group.length > 0) init.set(i, group[0].id)
    })
    setChoices(init)
  }, [open, duplicateGroups])

  const bookCountById = useMemo(() => {
    const m = new Map<AuthorId, number>()
    ;(nodes || []).forEach((b) => {
      ;(b.authorIds || []).forEach((aid) => m.set(aid, (m.get(aid) || 0) + 1))
    })
    return m
  }, [nodes])

  const totalToRemove = (duplicateGroups || []).reduce((acc, g) => acc + g.length - 1, 0)

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
          supprimer). Cliquez sur un·e auteur·ice pour choisir lequel conserver.
        </>
      }
      footer={
        <>
          <Button type="button" onClick={handleClose} variant="surface">
            Annuler
          </Button>
          <ConfirmButton
            confirmed={confirm}
            onClick={() => handleMergeDupes(choices)}
            label="Fusionner les doublons"
            confirmLabel={`Confirmer (−${totalToRemove})`}
          />
        </>
      }
    >
      <div className="mb-4 max-h-[min(40vh,320px)] overflow-y-auto rounded-xl border border-white/8 text-[0.8rem]">
        {duplicateGroups.map((group, i) => {
          const keepId = choices.get(i)
          return (
            <div key={i} className="border-b border-white/6 px-3 py-2 last:border-0">
              <div className="mb-1 text-[0.72rem] uppercase tracking-wide text-white/25">
                Groupe {i + 1} — {group.length} entrées
              </div>
              {group.map((author) => {
                const isKept = author.id === keepId
                const booksCount = bookCountById.get(author.id) || 0
                return (
                  <button
                    key={author.id}
                    type="button"
                    onClick={() => selectAuthor(i, author.id)}
                    className={[
                      'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-0.5 font-mono transition-colors',
                      isKept
                        ? 'bg-green/6 text-white/80'
                        : 'text-white/40 line-through decoration-white/15 hover:bg-white/4 hover:text-white/55',
                    ].join(' ')}
                  >
                    <span className={isKept ? 'text-green/60 text-[0.7rem]' : 'text-red/40 text-[0.7rem]'}>
                      {isKept ? '✓' : '✗'}
                    </span>
                    <span>{author.firstName || ''}</span>
                    <span className="font-semibold">{(author.lastName || '').toUpperCase()}</span>
                    <span className="ml-auto text-[0.7rem] text-white/20">
                      {booksCount} ouvrage{booksCount !== 1 ? 's' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
