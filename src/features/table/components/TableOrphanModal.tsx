import { useState } from 'react'
import { Check, Link2, Trash2 } from 'lucide-react'
import type { Book, BookId, Link } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'
import { NodeSearch } from './NodeSearch'

/**
 * Design-system checkbox: hidden native input + styled span + Check icon.
 * Matches the pattern used in LinksTab's checklist rows.
 */
function CheckboxBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
        checked ? 'border-green bg-green/18 text-green' : 'border-white/15 text-transparent',
      ].join(' ')}
      aria-hidden="true"
    >
      <Check size={9} />
    </span>
  )
}

type Props = {
  orphanModal: boolean
  orphans: Book[]
  allNodes: Book[]
  authorsMap: Map<string, AuthorNode>
  handleCleanOrphans: () => void
  orphanConfirm: boolean
  setOrphanModal: (v: boolean) => void
  setOrphanConfirm: (v: boolean) => void
  onAddLinks?: (links: Array<Partial<Link> & Pick<Link, 'source' | 'target'>>) => unknown
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
  onAddLinks,
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
    // Single batch insert: 38 rows → 1 HTTP request, atomic at DB level.
    // Calling the singular onAddLink in a loop lost rows (race / connection cap).
    const linksToAdd = Array.from(checkedIds).map((id) => ({
      source: linkTarget.id,
      target: id,
      citation_text: '',
      edition: '',
      page: '',
      context: '',
    }))
    onAddLinks?.(linksToAdd)
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
            <p className="text-caption text-white/35">
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

      {/* Orphan list with design-system checkboxes */}
      <div className="mb-4 max-h-[min(50vh,360px)] overflow-y-auto rounded-xl border border-white/8 bg-white/2.5 p-1.5">
        {/* Select all */}
        <label className="mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-mono text-micro text-white/40 transition-colors hover:bg-white/4">
          <input
            type="checkbox"
            className="sr-only"
            checked={allChecked}
            onChange={toggleAll}
          />
          <CheckboxBox checked={allChecked} />
          Tout sélectionner
        </label>

        {orphans.map((n) => {
          const isChecked = checkedIds.has(n.id)
          return (
            <label
              key={n.id}
              className={[
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/4',
                isChecked ? 'bg-green/4' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isChecked}
                onChange={() => toggleChecked(n.id)}
              />
              <CheckboxBox checked={isChecked} />
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
              <span className="min-w-0">
                <span className="block truncate font-mono text-label text-white/75">{n.title}</span>
                <span className="block font-mono text-micro text-white/30">
                  {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </Modal>
  )
}
