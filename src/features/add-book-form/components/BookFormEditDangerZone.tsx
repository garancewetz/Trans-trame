import { useMemo, useState } from 'react'
import type { Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { SearchableSelect } from '@/common/components/ui/SearchableSelect'
import { Merge, Trash2, X } from 'lucide-react'

type Props = {
  editNode: Book
  nodes: Book[]
  authorsMap: Map<string, AuthorNode>
  onMergeBooks?: (fromId: string, toId: string) => void
  onDeleteBook?: (id: string) => void
}

export function BookFormEditDangerZone({
  editNode,
  nodes,
  authorsMap,
  onMergeBooks,
  onDeleteBook,
}: Props) {
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeTarget, setMergeTarget] = useState<Book | null>(null)
  const [mergeConfirm, setMergeConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const mergeResults = useMemo(() => {
    const q = mergeSearch.toLowerCase().trim()
    if (!q) return []
    return (nodes || []).filter(
      (n) =>
        n.id !== editNode.id &&
        (n.title.toLowerCase().includes(q) || bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q)),
    )
  }, [mergeSearch, nodes, editNode.id, authorsMap])

  const handleMerge = () => {
    if (!mergeTarget) return
    if (!mergeConfirm) {
      setMergeConfirm(true)
      return
    }
    onMergeBooks?.(editNode.id, mergeTarget.id)
    setMergeSearch('')
    setMergeTarget(null)
    setMergeConfirm(false)
  }

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    onDeleteBook?.(editNode.id)
    setDeleteConfirm(false)
  }

  return (
    <div className="mt-4 rounded-xl border border-white/8 bg-white/2 p-4">
      <h4 className="mb-4 text-label font-semibold uppercase tracking-[1.5px] text-white/25">
        Zone dangereuse
      </h4>

      <div className="mb-4">
        <p className="mb-2 text-ui text-white/40">
          Fusionner cet ouvrage dans un autre (les liens seront transférés)
        </p>
        {!mergeTarget ? (
          <SearchableSelect<Book>
            query={mergeSearch}
            onQueryChange={setMergeSearch}
            results={mergeResults}
            getKey={(n) => n.id}
            onSelect={(n) => {
              setMergeTarget(n)
              setMergeSearch('')
              setMergeConfirm(false)
            }}
            placeholder="Rechercher l'ouvrage cible…"
            emptyMessage="Aucun ouvrage trouvé"
            renderItem={(n) => (
              <>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: axesGradient(n.axes) }} />
                <span className="min-w-0">
                  <strong className="block text-body font-semibold text-white">{n.title}</strong>
                  <span className="mt-0.5 block text-label text-white/35">
                    {bookAuthorDisplay(n, authorsMap)}
                    {n.year ? `, ${n.year}` : ''}
                  </span>
                </span>
              </>
            )}
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: axesGradient(mergeTarget.axes) }}
              />
              <span className="min-w-0 truncate text-body text-white">{mergeTarget.title}</span>
              <Button
                variant="icon"
                className="ml-auto shrink-0"
                type="button"
                onClick={() => {
                  setMergeTarget(null)
                  setMergeConfirm(false)
                }}
              >
                <X size={14} />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              outlineWeight="strong"
              tone="merge"
              active={mergeConfirm}
              icon={<Merge size={12} />}
              className="shrink-0"
              onClick={handleMerge}
            >
              {mergeConfirm ? 'Confirmer' : 'Fusionner'}
            </Button>
          </div>
        )}
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          outlineWeight="strong"
          tone="danger"
          active={deleteConfirm}
          icon={<Trash2 size={12} />}
          onClick={handleDelete}
          onBlur={() => setDeleteConfirm(false)}
        >
          {deleteConfirm ? 'Confirmer la suppression' : 'Supprimer l\u2019ouvrage'}
        </Button>
      </div>
    </div>
  )
}
