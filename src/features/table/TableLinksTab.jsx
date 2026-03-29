import { ArrowRight, Check, Link2, Search, Trash2 } from 'lucide-react'
import { bookAuthorDisplay } from '../../authorUtils'
import { axesGradient } from '../../categories'
import { INPUT } from './tableConstants'
import { NodeSearch } from './TableSubcomponents'

export default function TableLinksTab({
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
  groupedLinks,
  linkSearch,
  editingLink,
  editingLinkValue,
  setEditingLinkValue,
  setEditingLink,
  commitLinkEdit,
  deletingLinkId,
  setDeletingLinkId,
  onDeleteLink,
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
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
              setLinkCheckedIds(new Set())
              setChecklistSearch('')
            }}
            placeholder="Rechercher le livre source…"
          />
          {linkSourceNode && (
            <button
              type="button"
              onClick={() => { setLinkSourceNode(null); setLinkCheckedIds(new Set()) }}
              className="mt-1 cursor-pointer font-mono text-[0.6rem] text-white/22 hover:text-white/55"
            >
              × retirer
            </button>
          )}
        </div>

        {linkSourceNode ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-white/6 px-3 py-2">
              <div className="relative">
                <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/22" />
                <input
                  className="w-full rounded-md border border-white/8 bg-white/4 py-1 pl-6 pr-2 font-mono text-[0.72rem] text-white outline-none placeholder:text-white/18 focus:border-[rgba(140,220,255,0.28)]"
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
                      existing ? 'opacity-40 cursor-default' : '',
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
                      <span className="block truncate font-mono text-[0.74rem] text-white/75">
                        {n.title}
                      </span>
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
              <button
                type="button"
                onClick={handleTisser}
                disabled={newLinksCount === 0}
                className="w-full cursor-pointer rounded-lg border border-[rgba(140,220,255,0.28)] bg-[rgba(140,220,255,0.07)] py-2 text-[0.76rem] font-semibold text-[rgba(140,220,255,0.82)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-25 flex items-center justify-center gap-2"
              >
                <Link2 size={13} />
                {newLinksCount > 0 ? `Tisser ${newLinksCount} lien${newLinksCount > 1 ? 's' : ''}` : 'Tisser'}
              </button>
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-white/6 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-white/30">
          Relations existantes
          {linkSearch && (
            <span className="ml-2 font-normal normal-case text-white/20">
              — filtrées
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {groupedLinks.length === 0 ? (
            <p className="py-12 text-center font-mono text-[0.75rem] text-white/22">
              {linkSearch ? `Aucun résultat pour « ${linkSearch} »` : 'Aucun lien créé'}
            </p>
          ) : (
            groupedLinks.map((group) => (
              <div key={group.srcId || group.sourceNode?.id} className="mb-5">
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: axesGradient(group.sourceNode?.axes || []) }}
                  />
                  <span className="font-mono text-[0.8rem] font-semibold text-white/85">
                    {group.sourceNode?.title || '[ouvrage supprimé]'}
                  </span>
                  <span className="ml-1 font-mono text-[0.65rem] text-white/30">
                    {group.sourceNode ? authorName(group.sourceNode) : ''}
                    {group.sourceNode?.year ? `, ${group.sourceNode.year}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-white/6 px-2 py-px font-mono text-[0.6rem] text-white/30">
                    {group.links.length} lien{group.links.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="ml-3 flex flex-col gap-px border-l border-white/8 pl-3">
                  {group.links.map((link) => {
                    const isEditCtx = editingLink?.id === link.id && editingLink?.field === 'citation_text'
                    const isEditPage = editingLink?.id === link.id && editingLink?.field === 'page'
                    const isDeleting = deletingLinkId === link.id

                    return (
                      <div
                        key={link.id}
                        className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/4"
                      >
                        <ArrowRight size={11} className="mt-0.5 shrink-0 text-[rgba(140,220,255,0.25)]" />
                        <div className="min-w-0 flex-1">
                          <span className="block font-mono text-[0.76rem] text-white/75 truncate">
                            {link.targetNode?.title || '[ouvrage supprimé]'}
                            {link.targetNode && (
                              <span className="ml-1 text-white/30">
                                — {authorName(link.targetNode)}
                                {link.targetNode.year ? `, ${link.targetNode.year}` : ''}
                              </span>
                            )}
                          </span>

                          {isEditCtx ? (
                            <textarea
                              autoFocus
                              className={`${INPUT} mt-1 resize-none text-[0.72rem] leading-snug`}
                              rows={2}
                              value={editingLinkValue}
                              onChange={(e) => setEditingLinkValue(e.target.value)}
                              onBlur={commitLinkEdit}
                              onKeyDown={(e) => { if (e.key === 'Escape') setEditingLink(null) }}
                            />
                          ) : (
                            (link.citation_text || link.context) && (
                              <span
                                className="mt-0.5 block cursor-text font-mono text-[0.65rem] text-white/38 italic hover:text-white/65 truncate"
                                onClick={() => {
                                  setEditingLink({ id: link.id, field: 'citation_text' })
                                  setEditingLinkValue(link.citation_text || link.context || '')
                                }}
                                title={link.citation_text || link.context}
                              >
                                {link.citation_text || link.context}
                              </span>
                            )
                          )}
                        </div>

                        {isEditPage ? (
                          <input
                            autoFocus
                            className={`${INPUT} w-16 shrink-0`}
                            value={editingLinkValue}
                            onChange={(e) => setEditingLinkValue(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={commitLinkEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitLinkEdit()
                              if (e.key === 'Escape') setEditingLink(null)
                            }}
                          />
                        ) : (
                          <span
                            className="shrink-0 cursor-text font-mono text-[0.65rem] tabular-nums text-white/28 hover:text-white/55"
                            onClick={() => {
                              setEditingLink({ id: link.id, field: 'page' })
                              setEditingLinkValue(link.page || '')
                            }}
                          >
                            {link.page || ''}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (!isDeleting) { setDeletingLinkId(link.id); return }
                            onDeleteLink(link.id)
                            setDeletingLinkId(null)
                          }}
                          onBlur={() => { if (isDeleting) setDeletingLinkId(null) }}
                          className={[
                            'shrink-0 cursor-pointer rounded border px-1 py-0.5 text-[0.6rem] transition-all',
                            isDeleting
                              ? 'border-[rgba(255,55,55,0.45)] text-[rgba(255,100,100,0.8)]'
                              : 'border-transparent text-white/18 opacity-0 group-hover:opacity-100 hover:border-[rgba(255,55,55,0.28)] hover:text-[rgba(255,90,90,0.55)]',
                          ].join(' ')}
                          title={isDeleting ? 'Confirmer' : 'Supprimer'}
                        >
                          {isDeleting ? '×' : <Trash2 size={9} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
