import { ArrowRight, ArrowLeft, LinkIcon, BookCopy, ExternalLink, Trash2, Pencil, Plus, Eye, Check, X as XIcon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@/common/components/ui/Button'
import { AuthorLinks } from '@/common/components/AuthorLinks'
import { TextareaInline } from '@/common/components/ui/TextareaInline'
import { Badge } from '@/common/components/ui/Badge'
import { InlineEditField } from '@/common/components/ui/InlineEditField'
import { getLinkNodes } from '@/features/graph/graphRelations'
import { useSelection } from '@/core/SelectionContext'
import { useAppData, useAppMutations } from '@/core/AppDataContext'
import type { LinkCitation } from '@/types/domain'

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

type EditingState = null | { citationId: string; field: 'citation_text' | 'page' | 'edition' }

export function LinkDetails({ showBackButton = true }: LinkDetailsProps) {
  const {
    selectedLink,
    linkContextNode,
    selectNode,
    closePanel,
  } = useSelection()

  const { graphData, authorsMap } = useAppData()
  const {
    handleDeleteLink,
    handleAddCitation,
    handleUpdateCitation,
    handleDeleteCitation,
  } = useAppMutations()

  const suppressCommitRef = useRef(false)
  const [editing, setEditing] = useState<EditingState>(null)
  const [draftValue, setDraftValue] = useState('')
  const [addingCitation, setAddingCitation] = useState(false)
  const [newDraftText, setNewDraftText] = useState('')
  const [newDraftPage, setNewDraftPage] = useState('')
  const [newDraftEdition, setNewDraftEdition] = useState('')
  const [deletingLinkConfirm, setDeletingLinkConfirm] = useState(false)
  const [deletingCitationId, setDeletingCitationId] = useState<string | null>(null)

  // Read fresh link from graphData so optimistic citation mutations show up.
  const liveLink = useMemo(
    () => (selectedLink ? graphData.links.find((l) => l.id === selectedLink.id) : null),
    [graphData, selectedLink],
  )
  const citations: LinkCitation[] = liveLink?.citations ?? []

  const { source, target } = selectedLink
    ? getLinkNodes(graphData, selectedLink)
    : { source: undefined, target: undefined }
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

  if (!selectedLink || !liveLink) return null

  const startEditCitation = (citationId: string, field: 'citation_text' | 'page' | 'edition') => {
    const c = citations.find((x) => x.id === citationId)
    if (!c) return
    suppressCommitRef.current = false
    setEditing({ citationId, field })
    setDraftValue(field === 'citation_text' ? (c.citation_text || c.context || '') : (c[field] || ''))
  }

  const commitEdit = () => {
    if (!editing) return
    if (suppressCommitRef.current) {
      suppressCommitRef.current = false
      return
    }
    handleUpdateCitation(editing.citationId, { [editing.field]: draftValue.trim() })
    setEditing(null)
  }

  const cancelEdit = () => {
    suppressCommitRef.current = true
    setEditing(null)
  }

  const confirmDeleteLink = () => {
    if (deletingLinkConfirm) {
      handleDeleteLink(selectedLink.id)
      closePanel()
      setDeletingLinkConfirm(false)
      return
    }
    setDeletingLinkConfirm(true)
  }

  const confirmDeleteCitation = (citationId: string) => {
    if (deletingCitationId === citationId) {
      handleDeleteCitation(citationId)
      setDeletingCitationId(null)
      return
    }
    setDeletingCitationId(citationId)
  }

  const commitNewCitation = () => {
    const fields = {
      citation_text: newDraftText.trim(),
      page: newDraftPage.trim(),
      edition: newDraftEdition.trim(),
      context: '',
    }
    if (!fields.citation_text && !fields.page && !fields.edition) {
      setAddingCitation(false)
      return
    }
    handleAddCitation(selectedLink.id, fields)
    setNewDraftText('')
    setNewDraftPage('')
    setNewDraftEdition('')
    setAddingCitation(false)
  }

  return (
    <div className="px-6 pb-8 pt-12">
      {linkContextNode && !isContextPanel && (
        <p className="mb-3 text-[0.74rem] font-semibold tracking-[0.3px] text-text-soft">
          Ressources <span className="mx-1 text-text-dimmed">{'>'}</span> {linkContextNode.title}{' '}
          <span className="mx-1 text-text-dimmed">{'>'}</span> Citation
        </p>
      )}
      <Badge variant="inline" className={`mb-3 ${relationBadgeClass}`}>
        <LinkIcon size={11} /> {relationBadgeLabel}
      </Badge>
      {source && target && (
        <div className="mb-4 rounded-md border border-border-subtle bg-white/2 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-micro font-semibold uppercase tracking-[1px] text-text-muted">Source</span>
            <span className="min-w-0 truncate text-[0.74rem] font-mono text-white/85">
              {source.title}
              {source.year ? `, ${source.year}` : ''}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-micro font-semibold uppercase tracking-[1px] text-text-muted">Cité</span>
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
          <p className="mb-3 text-[0.83rem] text-text-soft">
            {relatedNode && (
              <AuthorLinks book={relatedNode} authors={authorsMap || []} />
            )}
            {relatedNode?.year ? ` — ${relatedNode.year}` : ''}
          </p>
        </>
      ) : (
        <>
          <p className="mb-2 text-[0.88rem] text-text-soft">
            Lecture simple: <strong className="text-orange/90">ressource qui cite</strong> <ArrowRight size={12} className="mx-1 inline text-text-secondary" />
            <strong className="text-cyan/90">ressource cité</strong>
          </p>
          <h2 className="mb-1 flex items-center gap-2 text-[1.1rem] font-bold leading-snug text-white">
            {source?.title} <ArrowRight size={16} className="shrink-0 text-white/40" /> {target?.title}
          </h2>
          <p className="mb-5 text-[0.95rem] text-text-soft">
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
          Revenir à la ressource de départ
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
            Ouvrir la ressource qui cite
          </Button>
        )}
        {!isContextPanel && target && !contextIsTarget && (
          <Button
            type="button"
            className={ACTION_BTN_TARGET}
            onClick={() => selectNode(target)}
          >
            <ExternalLink size={12} />
            Ouvrir la ressource cité
          </Button>
        )}
      </div>

      {/* ── Citations list ─────────────────────────────────────────────────────
          Each citation is rendered independently with its own edit/delete
          affordances. Add button at the bottom creates a new citation row.
          Deleting the last citation leaves the link (the edge) intact — to
          remove the edge itself use the "Supprimer le lien" action at the top
          right. */}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-micro font-semibold uppercase tracking-[1px] text-white/40">
          Citations {citations.length > 0 && <span className="ml-1 text-text-muted">({citations.length})</span>}
        </span>
        <Button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border-default bg-white/5 p-2 text-text-soft transition-all hover:border-red-400/40 hover:bg-red-400/8 hover:text-red-300"
          onClick={confirmDeleteLink}
          aria-label="Supprimer le lien"
          title={deletingLinkConfirm ? 'Confirmer la suppression du lien' : 'Supprimer le lien (et toutes ses citations)'}
        >
          {deletingLinkConfirm ? <XIcon size={14} /> : <Trash2 size={14} />}
        </Button>
      </div>

      {citations.length === 0 && !addingCitation && (
        <p className="mb-4 rounded-md border border-dashed border-border-default px-3 py-3 text-center text-[0.88rem] italic text-text-secondary">
          Aucune citation enregistrée pour ce lien.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3">
        {citations.map((c) => (
          <CitationEditor
            key={c.id}
            citation={c}
            isEditing={editing?.citationId === c.id ? editing.field : null}
            draftValue={draftValue}
            setDraftValue={setDraftValue}
            startEdit={(f) => startEditCitation(c.id, f)}
            commitEdit={commitEdit}
            cancelEdit={cancelEdit}
            isDeleting={deletingCitationId === c.id}
            onDelete={() => confirmDeleteCitation(c.id)}
            onCancelDelete={() => setDeletingCitationId(null)}
          />
        ))}

        {addingCitation && (
          <NewCitationForm
            text={newDraftText}
            page={newDraftPage}
            edition={newDraftEdition}
            setText={setNewDraftText}
            setPage={setNewDraftPage}
            setEdition={setNewDraftEdition}
            onCommit={commitNewCitation}
            onCancel={() => {
              setAddingCitation(false)
              setNewDraftText('')
              setNewDraftPage('')
              setNewDraftEdition('')
            }}
          />
        )}
      </div>

      {!addingCitation && (
        <Button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 bg-white/2 py-2 text-label font-semibold text-text-soft transition-all hover:border-cyan/35 hover:bg-cyan/5 hover:text-cyan/80"
          onClick={() => setAddingCitation(true)}
        >
          <Plus size={12} />
          Ajouter une citation
        </Button>
      )}
    </div>
  )
}

// ── Per-citation editor ──────────────────────────────────────────────────────

function CitationEditor({
  citation,
  isEditing,
  draftValue,
  setDraftValue,
  startEdit,
  commitEdit,
  cancelEdit,
  isDeleting,
  onDelete,
  onCancelDelete,
}: {
  citation: LinkCitation
  isEditing: 'citation_text' | 'page' | 'edition' | null
  draftValue: string
  setDraftValue: (v: string) => void
  startEdit: (field: 'citation_text' | 'page' | 'edition') => void
  commitEdit: () => void
  cancelEdit: () => void
  isDeleting: boolean
  onDelete: () => void
  onCancelDelete: () => void
}) {
  const excerpt = (citation.citation_text || citation.context || '').trim()

  return (
    <div className="rounded-md border border-border-subtle bg-white/2 p-3">
      <div className="flex items-start justify-between gap-2">
        <blockquote
          className="group/cite flex-1 rounded-md border-l-4 border-l-white/20 bg-white/5 px-4 py-3 font-serif text-lead italic leading-relaxed text-white/85 backdrop-blur-md"
          onDoubleClick={() => !isEditing && startEdit('citation_text')}
          title={isEditing ? undefined : 'Double-cliquer pour modifier'}
        >
          {isEditing === 'citation_text' ? (
            <>
              <TextareaInline
                autoFocus
                rows={3}
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelEdit()
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    commitEdit()
                  }
                }}
                placeholder="Ajouter le texte de la citation…"
              />
              <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-border-default pt-2 font-sans not-italic">
                <Button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border-default bg-white/5 px-2.5 py-1 text-caption font-semibold text-white/60 transition-all hover:border-white/20 hover:text-white"
                  onClick={cancelEdit}
                  title="Annuler (Échap)"
                >
                  <XIcon size={12} />
                  Annuler
                </Button>
                <Button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-caption font-semibold text-cyan/90 transition-all hover:border-cyan/50 hover:bg-cyan/20 hover:text-white"
                  onClick={commitEdit}
                  title="Enregistrer (⌘/Ctrl + Entrée)"
                >
                  <Check size={12} />
                  Enregistrer
                </Button>
              </div>
            </>
          ) : (
            <span className="flex items-start gap-2">
              <span className="flex-1">{excerpt || <span className="text-text-muted">—</span>}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEdit('citation_text') }}
                className="shrink-0 rounded p-1 text-text-dimmed opacity-0 transition-all hover:text-white group-hover/cite:opacity-100"
                title="Modifier le texte"
                aria-label="Modifier le texte"
              >
                <Pencil size={12} />
              </button>
            </span>
          )}
        </blockquote>
        <button
          type="button"
          onClick={isDeleting ? onDelete : onDelete}
          onBlur={() => { if (isDeleting) onCancelDelete() }}
          className={`shrink-0 inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors ${
            isDeleting
              ? 'bg-red-400/15 text-red-300'
              : 'text-text-dimmed hover:bg-red-400/10 hover:text-red-300'
          }`}
          title={isDeleting ? 'Confirmer la suppression' : 'Supprimer la citation'}
          aria-label={isDeleting ? 'Confirmer la suppression' : 'Supprimer la citation'}
        >
          {isDeleting ? <XIcon size={12} /> : <Trash2 size={12} />}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle pt-2 font-sans text-caption text-text-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-micro font-semibold uppercase tracking-[0.5px] text-text-muted">Passage</span>
          <InlineEditField
            editing={isEditing === 'page'}
            value={draftValue}
            onChange={setDraftValue}
            onCommit={commitEdit}
            onCancel={cancelEdit}
            onStartEdit={() => startEdit('page')}
            displayValue={citation.page || '—'}
            editTitle="Modifier le passage"
          />
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookCopy size={11} className="text-text-muted" />
          <InlineEditField
            editing={isEditing === 'edition'}
            value={draftValue}
            onChange={setDraftValue}
            onCommit={commitEdit}
            onCancel={cancelEdit}
            onStartEdit={() => startEdit('edition')}
            displayValue={citation.edition || 'éd.—'}
            placeholder="éd.—"
            editTitle="Modifier l'édition"
          />
        </span>
      </div>
    </div>
  )
}

// ── New-citation inline form ─────────────────────────────────────────────────

function NewCitationForm({
  text,
  page,
  edition,
  setText,
  setPage,
  setEdition,
  onCommit,
  onCancel,
}: {
  text: string
  page: string
  edition: string
  setText: (v: string) => void
  setPage: (v: string) => void
  setEdition: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-md border border-cyan/20 bg-cyan/3 p-3">
      <TextareaInline
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onCommit()
          }
        }}
        placeholder="Texte de la citation…"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border-default pt-2 text-label text-text-soft">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-micro font-semibold uppercase tracking-[0.5px] text-text-muted">Passage</span>
          <input
            type="text"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="p. —"
            className="w-24 rounded-md border border-border-default bg-white/5 px-2 py-1 text-label text-white/80 focus:border-cyan/35 focus:outline-none"
          />
        </label>
        <label className="inline-flex items-center gap-1.5">
          <BookCopy size={11} className="text-text-muted" />
          <input
            type="text"
            value={edition}
            onChange={(e) => setEdition(e.target.value)}
            placeholder="éd.—"
            className="w-32 rounded-md border border-border-default bg-white/5 px-2 py-1 text-label text-white/80 focus:border-cyan/35 focus:outline-none"
          />
        </label>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border-default bg-white/5 px-2.5 py-1 text-caption font-semibold text-white/60 transition-all hover:border-white/20 hover:text-white"
            onClick={onCancel}
          >
            <XIcon size={12} />
            Annuler
          </Button>
          <Button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-caption font-semibold text-cyan/90 transition-all hover:border-cyan/50 hover:bg-cyan/20 hover:text-white"
            onClick={onCommit}
          >
            <Check size={12} />
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  )
}
