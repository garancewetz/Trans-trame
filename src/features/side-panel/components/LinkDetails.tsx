import { ArrowRight, ArrowLeft, LinkIcon, BookCopy, ExternalLink, Trash2, Pencil, MoreHorizontal, Eye, Check, X as XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/common/components/ui/Button'
import { AuthorLinks } from '@/common/components/AuthorLinks'
import { TextareaInline } from '@/common/components/ui/TextareaInline'
import { Badge } from '@/common/components/ui/Badge'
import { InlineEditField } from '@/common/components/ui/InlineEditField'
import { getLinkNodes } from '@/features/graph/graphRelations'
import { useSelection } from '@/core/SelectionContext'
import { useAppData, useAppMutations } from '@/core/AppDataContext'

/** Shell used by the contextual action buttons in this panel. */
const ACTION_BTN_BASE =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-ui font-semibold transition-all'
const ACTION_BTN_NEUTRAL =
  `${ACTION_BTN_BASE} text-white/75 hover:border-white/35 hover:bg-white/10 hover:text-white`
const ACTION_BTN_SOURCE =
  `${ACTION_BTN_BASE} text-orange/75 hover:border-orange/45 hover:bg-orange/15 hover:text-white`
const ACTION_BTN_TARGET =
  `${ACTION_BTN_BASE} text-cyan/75 hover:border-cyan/50 hover:bg-cyan/15 hover:text-white`

type LinkDetailsProps = {
  showBackButton?: boolean
}

export function LinkDetails({ showBackButton = true }: LinkDetailsProps) {
  const {
    selectedLink,
    linkContextNode,
    selectNode,
    closePanel,
  } = useSelection()

  const { graphData, authorsMap } = useAppData()
  const { handleUpdateLink, handleDeleteLink } = useAppMutations()

  const suppressCommitRef = useRef(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [draftCitation, setDraftCitation] = useState('')
  const [draftPage, setDraftPage] = useState('')
  const [draftEdition, setDraftEdition] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)

  const { source, target } = selectedLink ? getLinkNodes(graphData, selectedLink) : { source: undefined, target: undefined }
  const contextIsSource = linkContextNode?.id && source?.id && linkContextNode.id === source.id
  const contextIsTarget = linkContextNode?.id && target?.id && linkContextNode.id === target.id
  const isContextPanel = !showBackButton && Boolean(linkContextNode)
  const relatedNode = contextIsSource ? target : source
  const relationBadgeLabel = isContextPanel ? (contextIsSource ? 'cite' : 'est cité·e par') : 'Lien'
  const relationBadgeClass = isContextPanel
    ? contextIsSource
      ? 'bg-cyan/20 text-cyan/95'
      : 'bg-orange/22 text-orange/95'
    : 'bg-linear-to-br from-cyan/80 to-blue/90 text-white'

  const excerpt = (selectedLink?.citation_text || selectedLink?.context || '').trim()
  const citationMetaYear = linkContextNode?.year ?? relatedNode?.year ?? source?.year ?? target?.year

  if (!selectedLink) return null

  const commitField = (field: string) => {
    if (!handleUpdateLink || !selectedLink?.id) return
    if (suppressCommitRef.current) {
      suppressCommitRef.current = false
      return
    }

    if (field === 'citation_text') {
      handleUpdateLink(selectedLink.id, { citation_text: draftCitation.trim() })
      return
    }
    if (field === 'page') {
      handleUpdateLink(selectedLink.id, { page: draftPage.trim() })
      return
    }
    if (field === 'edition') {
      handleUpdateLink(selectedLink.id, { edition: draftEdition.trim() })
    }
  }

  const startEdit = (field: string) => {
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
    if (!handleDeleteLink || !selectedLink?.id) return
    if (isDeleting) {
      handleDeleteLink(selectedLink.id)
      closePanel()
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
      <Badge variant="inline" className={`mb-3 ${relationBadgeClass}`}>
        <LinkIcon size={11} /> {relationBadgeLabel}
      </Badge>
      {source && target && (
        <div className="mb-4 rounded-md border border-white/8 bg-white/2 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-micro font-semibold uppercase tracking-[1px] text-white/30">Source</span>
            <span className="min-w-0 truncate text-[0.74rem] font-mono text-white/85">
              {source.title}
              {source.year ? `, ${source.year}` : ''}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-micro font-semibold uppercase tracking-[1px] text-white/30">Cité</span>
            <span className="min-w-0 truncate text-[0.74rem] font-mono text-white/85">
              {target.title}
              {target.year ? `, ${target.year}` : ''}
            </span>
          </div>
        </div>
      )}
      {isContextPanel ? (
        <>
          <h2 className="mb-1 text-lead font-bold leading-snug text-white">{relatedNode?.title}</h2>
          <p className="mb-3 text-[0.83rem] text-white/50">
            {relatedNode && (
              <AuthorLinks book={relatedNode} authors={authorsMap || []} />
            )}
            {relatedNode?.year ? ` — ${relatedNode.year}` : ''}
          </p>

          <p className="mb-3 flex items-center justify-between gap-2 text-ui font-semibold uppercase tracking-[0.5px] text-white/45">
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
              displayValue={selectedLink.page || '—'}
              editTitle="Modifier le passage"
            />
          </p>
        </>
      ) : (
        <>
          <p className="mb-2 text-[0.88rem] text-white/55">
            Lecture simple: <strong className="text-orange/90">ouvrage qui cite</strong> <ArrowRight size={12} className="mx-1 inline text-white/35" />
            <strong className="text-cyan/90">ouvrage cité</strong>
          </p>
          <h2 className="mb-1 flex items-center gap-2 text-[1.1rem] font-bold leading-snug text-white">
            {source?.title} <ArrowRight size={16} className="shrink-0 text-white/40" /> {target?.title}
          </h2>
          <p className="mb-5 text-[0.95rem] text-white/45">
            {source && <AuthorLinks book={source} authors={authorsMap || []} />}
            {' '}&mdash;{' '}
            {target && <AuthorLinks book={target} authors={authorsMap || []} />}
          </p>
        </>
      )}
      {linkContextNode && showBackButton && (
        <Button
          type="button"
          className={`mb-3 ${ACTION_BTN_NEUTRAL}`}
          onClick={() => selectNode(linkContextNode)}
        >
          <ArrowLeft size={12} />
          Revenir à l'ouvrage de départ
        </Button>
      )}
      <div className="mb-5 flex flex-wrap gap-2">
        {isContextPanel && relatedNode && (
          <Button
            type="button"
            className={ACTION_BTN_NEUTRAL}
            onClick={() => selectNode(relatedNode)}
          >
            <Eye size={12} />
            Voir dans le Graphe
          </Button>
        )}
        {!isContextPanel && source && !contextIsSource && (
          <Button
            type="button"
            className={ACTION_BTN_SOURCE}
            onClick={() => selectNode(source)}
          >
            <ExternalLink size={12} />
            Ouvrir l'ouvrage qui cite
          </Button>
        )}
        {!isContextPanel && target && !contextIsTarget && (
          <Button
            type="button"
            className={ACTION_BTN_TARGET}
            onClick={() => selectNode(target)}
          >
            <ExternalLink size={12} />
            Ouvrir l'ouvrage cité
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-body font-semibold text-white/80 hover:bg-white/8"
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-body font-semibold text-white/80 hover:bg-white/8"
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
          className="rounded-md border-l-4 bg-white/5 px-4 py-3 font-serif text-lead italic leading-relaxed text-white/85 backdrop-blur-md"
        >
          {editingField === 'citation_text' ? (
            <>
              <TextareaInline
                autoFocus
                rows={3}
                value={draftCitation}
                onChange={(e) => setDraftCitation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    cancelEdit()
                  }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    commitField('citation_text')
                    setEditingField(null)
                  }
                }}
                placeholder="Ajouter une citation…"
              />
              <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-white/10 pt-2 font-sans not-italic">
                <Button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-caption font-semibold text-white/60 transition-all hover:border-white/20 hover:text-white"
                  onClick={cancelEdit}
                  title="Annuler (Échap)"
                >
                  <XIcon size={12} />
                  Annuler
                </Button>
                <Button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-caption font-semibold text-cyan/90 transition-all hover:border-cyan/50 hover:bg-cyan/20 hover:text-white"
                  onClick={() => { commitField('citation_text'); setEditingField(null) }}
                  title="Enregistrer (⌘/Ctrl + Entrée)"
                >
                  <Check size={12} />
                  Enregistrer
                </Button>
              </div>
            </>
          ) : (
            <>
              {excerpt || '—'}
              <div className="mt-2 border-t border-white/10 pt-2 font-sans text-caption not-italic text-white/40">
                {[
                  selectedLink.page ? selectedLink.page : null,
                  citationMetaYear ? String(citationMetaYear) : null,
                  selectedLink.edition ? selectedLink.edition : null,
                ]
                  .filter(Boolean)
                  .join(' • ') || ' '}
              </div>
            </>
          )}
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
