import { ArrowRight, ArrowLeft, LinkIcon, BookCopy, ExternalLink, Trash2, Pencil, MoreHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { blendAxesColors } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { TextareaInline } from '@/common/components/ui/TextareaInline'
import { InlineBadge } from '@/common/components/ui/InlineBadge'
import { InlineEditField } from '@/common/components/ui/InlineEditField'

export function LinkDetails({
  selectedLink,
  getLinkNodes,
  linkContextNode,
  authorsMap,
  onUpdateLink,
  onDeleteLink,
  onClosePanel,
  showBackButton = true,
  onBackToContextNode,
  onOpenNode,
}) {
  const suppressCommitRef = useRef(false)
  const [editingField, setEditingField] = useState(null)
  const [draftCitation, setDraftCitation] = useState('')
  const [draftPage, setDraftPage] = useState('')
  const [draftEdition, setDraftEdition] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)

  const { source, target } = getLinkNodes(selectedLink)
  const contextIsSource = linkContextNode?.id && source?.id && linkContextNode.id === source.id
  const contextIsTarget = linkContextNode?.id && target?.id && linkContextNode.id === target.id
  const isContextPanel = !showBackButton && Boolean(linkContextNode)
  const relatedNode = contextIsSource ? target : source
  const relationBadgeLabel = isContextPanel ? (contextIsSource ? 'cite' : 'est cite par') : 'Lien'
  const relationBadgeClass = isContextPanel
    ? contextIsSource
      ? 'bg-cyan/20 text-cyan/95'
      : 'bg-orange/22 text-orange/95'
    : 'bg-linear-to-br from-cyan/80 to-blue/90 text-white'

  const excerpt = (selectedLink?.citation_text || selectedLink?.context || '').trim()
  const axesForCitation = linkContextNode?.axes ?? relatedNode?.axes
  const citationAxisColor = blendAxesColors(axesForCitation)
  const citationMetaYear = linkContextNode?.year ?? relatedNode?.year ?? source?.year ?? target?.year

  const commitField = (field) => {
    if (!onUpdateLink || !selectedLink?.id) return
    if (suppressCommitRef.current) {
      suppressCommitRef.current = false
      return
    }

    if (field === 'citation_text') {
      onUpdateLink(selectedLink.id, { citation_text: draftCitation.trim() })
      return
    }
    if (field === 'page') {
      onUpdateLink(selectedLink.id, { page: draftPage.trim() })
      return
    }
    if (field === 'edition') {
      onUpdateLink(selectedLink.id, { edition: draftEdition.trim() })
    }
  }

  const startEdit = (field) => {
    setIsDeleting(false)
    suppressCommitRef.current = false
    setEditingField(field)
  }

  const cancelEdit = () => {
    suppressCommitRef.current = true
    setEditingField(null)
    setDraftCitation(selectedLink?.citation_text || selectedLink?.context || '')
    setDraftPage(selectedLink?.page || '')
    setDraftEdition(selectedLink?.edition || '')
  }

  const handleConfirmDelete = () => {
    if (!onDeleteLink || !selectedLink?.id) return
    if (isDeleting) {
      onDeleteLink(selectedLink.id)
      onClosePanel?.()
      setIsDeleting(false)
      return
    }
    setIsDeleting(true)
  }

  return (
    <div className="px-6 pb-8 pt-12">
      {linkContextNode && !isContextPanel && (
        <p className="mb-3 text-[0.74rem] font-semibold tracking-[0.3px] text-white/45">
          Ouvrages <span className="mx-1 text-white/25">{'>'}</span> {linkContextNode.title}{' '}
          <span className="mx-1 text-white/25">{'>'}</span> Citation
        </p>
      )}
      <InlineBadge className={`mb-3 ${relationBadgeClass}`}>
        <LinkIcon size={11} /> {relationBadgeLabel}
      </InlineBadge>
      {source && target && (
        <div className="mb-4 rounded-md border border-white/8 bg-white/2 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/30">Source</span>
            <span className="min-w-0 truncate text-[0.74rem] font-mono text-white/85">
              {source.title}
              {source.year ? `, ${source.year}` : ''}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[1px] text-white/30">Cité</span>
            <span className="min-w-0 truncate text-[0.74rem] font-mono text-white/85">
              {target.title}
              {target.year ? `, ${target.year}` : ''}
            </span>
          </div>
        </div>
      )}
      {isContextPanel ? (
        <>
          <h2 className="mb-1 text-[1.05rem] font-bold leading-snug text-white">{relatedNode?.title}</h2>
          <p className="mb-3 text-[0.83rem] text-white/50">
            {relatedNode ? bookAuthorDisplay(relatedNode, authorsMap || []) : ''}
            {relatedNode?.year ? ` — ${relatedNode.year}` : ''}
          </p>
      
          <p className="mb-3 flex items-center justify-between gap-2 text-[0.85rem] font-semibold uppercase tracking-[0.5px] text-white/45">
            <span>Passage:</span>
            <InlineEditField
              editing={editingField === 'page'}
              value={draftPage}
              onChange={setDraftPage}
              onCommit={() => { commitField('page'); setEditingField(null) }}
              onCancel={cancelEdit}
              onStartEdit={() => {
                setDraftPage(selectedLink.page || '')
                startEdit('page')
              }}
              displayValue={selectedLink.page || 'p.—'}
              editTitle="Modifier le passage"
            />
          </p>
        </>
      ) : (
        <>
          <p className="mb-2 text-[0.88rem] text-white/55">
            Lecture simple: <strong className="text-orange/90">ouvrage qui cite</strong> <ArrowRight size={12} className="mx-1 inline text-white/35" />
            <strong className="text-cyan/90">ouvrage cite</strong>
          </p>
          <h2 className="mb-1 flex items-center gap-2 text-[1.1rem] font-bold leading-snug text-white">
            {source?.title} <ArrowRight size={16} className="shrink-0 text-white/40" /> {target?.title}
          </h2>
          <p className="mb-5 text-[0.95rem] text-white/45">
            {source ? bookAuthorDisplay(source, authorsMap || []) : ''} &mdash;{' '}
            {target ? bookAuthorDisplay(target, authorsMap || []) : ''}
          </p>
        </>
      )}
      {linkContextNode && showBackButton && (
        <Button
          type="button"
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.85rem] font-semibold text-white/70 transition-all hover:border-white/35 hover:bg-white/10 hover:text-white"
          onClick={() => onBackToContextNode?.(linkContextNode)}
        >
          <ArrowLeft size={12} />
          Revenir a l'ouvrage de depart
        </Button>
      )}
      <div className="mb-5 flex flex-wrap gap-2">
        {isContextPanel && relatedNode && (
          <Button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.85rem] font-semibold text-white/75 transition-all hover:border-white/35 hover:bg-white/10 hover:text-white"
            onClick={() => onOpenNode?.(relatedNode)}
          >
            <ExternalLink size={12} />
            Voir cet ouvrage
          </Button>
        )}
        {!isContextPanel && source && !contextIsSource && (
          <Button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.85rem] font-semibold text-orange/75 transition-all hover:border-orange/45 hover:bg-orange/15 hover:text-white"
            onClick={() => onOpenNode?.(source)}
          >
            <ExternalLink size={12} />
            Ouvrir l'ouvrage qui cite
          </Button>
        )}
        {!isContextPanel && target && !contextIsTarget && (
          <Button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.85rem] font-semibold text-cyan/75 transition-all hover:border-cyan/50 hover:bg-cyan/15 hover:text-white"
            onClick={() => onOpenNode?.(target)}
          >
            <ExternalLink size={12} />
            Ouvrir l'ouvrage cite
          </Button>
        )}
      </div>
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-end">
          <div className="relative">
            <Button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-white/55 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
              onClick={() => setIsActionsOpen((v) => !v)}
              aria-label="Actions"
              title="Actions"
            >
              <MoreHorizontal size={18} />
            </Button>

            {isActionsOpen && (
              <div className="absolute right-0 z-10 mt-2 w-[220px] overflow-hidden rounded-lg border border-white/10 bg-bg-overlay/72 backdrop-blur-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.92rem] font-semibold text-white/80 hover:bg-white/8"
                  onClick={() => {
                    setIsActionsOpen(false)
                    if (editingField === 'citation_text') cancelEdit()
                    else {
                      setDraftCitation(selectedLink.citation_text || selectedLink.context || '')
                      startEdit('citation_text')
                    }
                  }}
                >
                  <Pencil size={14} />
                  {editingField === 'citation_text' ? "Annuler l'édition" : 'Modifier la citation'}
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.92rem] font-semibold text-white/80 hover:bg-white/8"
                  onClick={() => {
                    setIsActionsOpen(false)
                    handleConfirmDelete()
                  }}
                >
                  <Trash2 size={14} />
                  {isDeleting ? '× Confirmer la suppression' : 'Supprimer'}
                </button>
              </div>
            )}
          </div>
        </div>

        <blockquote
          className="rounded-md border-l-4 bg-white/5 px-4 py-3 font-serif text-[1.05rem] italic leading-relaxed text-white/85 backdrop-blur-md"
        >
          {editingField === 'citation_text' ? (
            <TextareaInline
              autoFocus
              rows={3}
              value={draftCitation}
              onChange={(e) => setDraftCitation(e.target.value)}
              onBlur={() => { commitField('citation_text'); setEditingField(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit()
              }}
              placeholder="Ajouter une citation…"
            />
          ) : (
            excerpt || '—'
          )}

          <div className="mt-2 border-t border-white/10 pt-2 font-sans text-[0.75rem] not-italic text-white/40">
            {[
              selectedLink.page ? `p. ${selectedLink.page}` : null,
              citationMetaYear ? String(citationMetaYear) : null,
              selectedLink.edition ? selectedLink.edition : null,
            ]
              .filter(Boolean)
              .join(' • ') || ' '}
          </div>
        </blockquote>
      </div>

      <p className="mb-4 inline-flex items-center gap-1.5 text-[0.9rem] text-white/40">
        <BookCopy size={12} className="shrink-0 text-white/50" />
        <InlineEditField
          editing={editingField === 'edition'}
          value={draftEdition}
          onChange={setDraftEdition}
          onCommit={() => { commitField('edition'); setEditingField(null) }}
          onCancel={cancelEdit}
          onStartEdit={() => {
            setDraftEdition(selectedLink.edition || '')
            startEdit('edition')
          }}
          displayValue={selectedLink.edition || 'éd.—'}
          placeholder="éd.—"
          editTitle="Modifier l'édition"
        />
      </p>
    </div>
  )
}

