import { useState } from 'react'
import { Link2, Trash2 } from 'lucide-react'
import type { Book, BookId, Link } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'
import { NodeSearch } from './TableSubcomponents'

type Props = {
  orphanModal: boolean
  orphans: Book[]
  allNodes: Book[]
  authorsMap: Map<string, AuthorNode>
  handleCleanOrphans: () => void
  orphanConfirm: boolean
  setOrphanModal: (v: boolean) => void
  setOrphanConfirm: (v: boolean) => void
  onAddLink?: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => unknown
}

export function TableOrphanModal({
  orphanModal,
  orphans,
  allNodes,
  authorsMap,
  handleCleanOrphans,
  orphanConfirm,
  setOrphanModal,
  setOrphanConfirm,
  onAddLink,
}: Props) {
  const [linkTarget, setLinkTarget] = useState<Book | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<BookId>>(new Set())
  const [linkConfirm, setLinkConfirm] = useState(false)

  const handleClose = () => {
    setOrphanModal(false)
    setOrphanConfirm(false)
    setLinkTarget(null)
    setCheckedIds(new Set())
    setLinkConfirm(false)
  }

  const toggleChecked = (id: BookId) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setLinkConfirm(false)
  }

  const allChecked = orphans.length > 0 && orphans.every((n) => checkedIds.has(n.id))

  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(orphans.map((n) => n.id)))
    }
    setLinkConfirm(false)
  }

  const handleLink = () => {
    if (!linkTarget || checkedIds.size === 0) return
    if (!linkConfirm) { setLinkConfirm(true); return }
    checkedIds.forEach((id) => {
      onAddLink?.({
        source: linkTarget.id,
        target: id,
        citation_text: '',
        edition: '',
        page: '',
        context: '',
      })
    })
    setCheckedIds(new Set())
    setLinkTarget(null)
    setLinkConfirm(false)
  }

  const canLink = linkTarget && checkedIds.size > 0

  return (
    <Modal
      open={orphanModal}
      title="Ouvrages orphelins"
      subtitle={`${orphans.length} ouvrage${orphans.length > 1 ? 's' : ''} sans aucun lien dans la galaxie.`}
      footer={
        <>
          <Button type="button" onClick={handleClose} variant="surface">
            Fermer
          </Button>
          <ConfirmButton
            confirmed={orphanConfirm}
            onClick={handleCleanOrphans}
            label={<><Trash2 size={11} className="inline -mt-px" /> Supprimer tous</>}
            confirmLabel={`Supprimer (${orphans.length})`}
          />
        </>
      }
    >
      {/* Link section */}
      <div className="mb-3 rounded-xl border border-white/8 bg-white/2.5 p-3">
        <p className="mb-2 text-[0.78rem] font-semibold text-white/50">
          Relier comme livre cité dans :
        </p>
        <NodeSearch
          nodes={allNodes}
          authorsMap={authorsMap}
          value={linkTarget}
          onSelect={(n) => { setLinkTarget(n); setLinkConfirm(false) }}
          placeholder="Chercher l'ouvrage source…"
          exclude={orphans.map((n) => n.id)}
        />
        {linkTarget && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[0.75rem] text-white/35">
              {checkedIds.size} orphelin{checkedIds.size > 1 ? 's' : ''} sélectionné{checkedIds.size > 1 ? 's' : ''}
            </p>
            <ConfirmButton
              confirmed={linkConfirm}
              onClick={handleLink}
              tone="merge"
              icon={<Link2 size={11} />}
              label={`Lier (${checkedIds.size})`}
              confirmLabel={`Confirmer (${checkedIds.size})`}
              disabled={!canLink}
            />
          </div>
        )}
      </div>

      {/* Orphan list with checkboxes */}
      <div className="mb-4 max-h-[min(50vh,360px)] overflow-y-auto rounded-xl border border-white/8 bg-white/2.5 p-2">
        {/* Select all */}
        <label className="mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[0.72rem] text-white/35 hover:bg-white/4">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="accent-cyan"
          />
          Tout sélectionner
        </label>

        {orphans.map((n) => (
          <label
            key={n.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/4"
          >
            <input
              type="checkbox"
              checked={checkedIds.has(n.id)}
              onChange={() => toggleChecked(n.id)}
              className="accent-cyan"
            />
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
            <span>
              <strong className="block font-mono text-[0.88rem] text-white">{n.title}</strong>
              <span className="font-mono text-[0.75rem] text-white/32">
                {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
              </span>
            </span>
          </label>
        ))}
      </div>
    </Modal>
  )
}
