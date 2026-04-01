import { Check, Link2, Search } from 'lucide-react'
import { bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { NodeSearch } from './TableSubcomponents'
import type { Book, BookId } from '@/types/domain'

type Props = {
  nodes: Book[]
  authorsMap: Map<string, AuthorNode>
  linkSourceNode: Book | null
  setLinkSourceNode: (node: Book | null) => void
  setLinkCheckedIds: (next: Set<BookId>) => void
  checklistSearch: string
  setChecklistSearch: (value: string) => void
  checklistNodes: Book[]
  existingTargetIds: Set<BookId>
  linkCheckedIds: Set<BookId>
  toggleChecklist: (id: BookId) => void
  newLinksCount: number
  handleTisser: () => void
}

export function LinkSourcePanel({
  nodes,
  authorsMap,
  linkSourceNode,
  setLinkSourceNode,
  setLinkCheckedIds,
  checklistSearch,
  setChecklistSearch,
  checklistNodes,
  existingTargetIds,
  linkCheckedIds,
  toggleChecklist,
  newLinksCount,
  handleTisser,
}: Props) {
  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-white/8">
      <div className="shrink-0 border-b border-white/8 p-4">
        <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/30">
          Livre source
        </p>
        <NodeSearch
          nodes={nodes}
          authorsMap={authorsMap}
          value={linkSourceNode}
          onSelect={(n) => {
            setLinkSourceNode(n)
            setLinkCheckedIds(new Set<BookId>())
            setChecklistSearch('')
          }}
          placeholder="Rechercher le livre source…"
        />
        {linkSourceNode && (
          <Button
            type="button"
            onClick={() => { setLinkSourceNode(null); setLinkCheckedIds(new Set<BookId>()) }}
            className="mt-1 cursor-pointer font-mono text-[0.6rem] text-white/22 hover:text-white/55"
          >
            × retirer
          </Button>
        )}
      </div>

      {linkSourceNode ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-white/6 px-3 py-2">
            <div className="relative">
              <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/22" />
              <TextInput
                variant="table"
                className="rounded-md border border-white/8 bg-white/4 py-1 pl-6 pr-2 text-[0.72rem] focus:border-[rgba(140,220,255,0.28)]"
                placeholder="Filtrer les cibles…"
                value={checklistSearch}
                onChange={(e) => setChecklistSearch(e.target.value)}
              />
            </div>
            <p className="mt-1 text-[0.6rem] text-white/25">
              {newLinksCount > 0
                ? `${newLinksCount} nouveau${newLinksCount > 1 ? 'x' : ''} lien${newLinksCount > 1 ? 's' : ''} à créer`
                : 'Cocher les livres à relier'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {checklistNodes.map((n) => {
              const existing = existingTargetIds.has(n.id)
              const checked = existing || linkCheckedIds.has(n.id)
              return (
                <label
                  key={n.id}
                  className={[
                    'flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/4',
                    existing ? 'cursor-default opacity-40' : '',
                    linkCheckedIds.has(n.id) ? 'bg-[rgba(0,255,135,0.04)]' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                      checked
                        ? existing
                          ? 'border-white/25 bg-white/10 text-white/40'
                          : 'border-[#00FF87] bg-[rgba(0,255,135,0.18)] text-[#00FF87]'
                        : 'border-white/15 text-transparent',
                    ].join(' ')}
                  >
                    <Check size={9} />
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={existing}
                    onChange={() => toggleChecklist(n.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[0.74rem] text-white/75">{n.title}</span>
                    <span className="block font-mono text-[0.62rem] text-white/30">
                      {bookAuthorDisplay(n, authorsMap)}{n.year ? `, ${n.year}` : ''}
                      {existing && ' · existant'}
                    </span>
                  </span>
                </label>
              )
            })}
            {checklistNodes.length === 0 && (
              <p className="px-3 py-4 font-mono text-[0.72rem] text-white/22">
                {checklistSearch ? 'Aucun résultat' : 'Aucun autre ouvrage'}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-white/8 p-3">
            <Button
              type="button"
              onClick={handleTisser}
              disabled={newLinksCount === 0}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] py-2 text-[0.76rem] font-semibold text-[rgba(140,220,255,0.82)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25"
            >
              <Link2 size={13} />
              {newLinksCount > 0 ? `Tisser ${newLinksCount} lien${newLinksCount > 1 ? 's' : ''}` : 'Tisser'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center font-mono text-[0.72rem] text-white/22">
            Sélectionnez un livre<br />source pour commencer
          </p>
        </div>
      )}
    </div>
  )
}
