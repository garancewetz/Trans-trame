import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Link2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/common/components/ui/Button'
import { useAppData, useAppMutations } from '@/core/AppDataContext'
import { loadDeletedBookTitles } from '@/features/graph/api/graphDataApi'
import { normalizeEndpointId } from '@/features/graph/domain/graphDataModel'
import type { Author, Book, Link } from '@/types/domain'

type AnomalyKind =
  | 'book-empty-title'
  | 'book-no-author'
  | 'link-orphan-source'
  | 'link-orphan-target'
  | 'duplicate-author'

type AnomalyAction = { kind: 'delete-link'; linkId: string }

type Anomaly = {
  id: string
  kind: AnomalyKind
  label: string
  details?: string
  action?: AnomalyAction
}

// Exact-match deduplication only. "Stephen" and "Steven" must stay distinct —
// real homonyms get conflated otherwise.
function normalizeName(first: string | undefined, last: string | undefined): string {
  return `${(first ?? '').trim()} ${(last ?? '').trim()}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectAnomalies(
  books: Book[],
  authors: Author[],
  links: Link[],
  deletedBookTitles?: Map<string, string>,
): Anomaly[] {
  const out: Anomaly[] = []
  const bookById = new Map(books.map((b) => [b.id, b]))

  const resolveMissing = (id: string | null | undefined): string => {
    if (!id) return '(inconnu)'
    const fromLog = deletedBookTitles?.get(id)
    if (fromLog) return `${fromLog} (supprimé·e)`
    return `(id: ${id})`
  }

  for (const b of books) {
    if (!(b.title ?? '').trim()) {
      out.push({
        id: `book-empty-title:${b.id}`,
        kind: 'book-empty-title',
        label: 'Ressource sans titre',
        details: b.id,
      })
    }
    if (!b.authorIds || b.authorIds.length === 0) {
      out.push({
        id: `book-no-author:${b.id}`,
        kind: 'book-no-author',
        label: `${b.title || '(sans titre)'} — sans auteur·ice`,
      })
    }
  }

  for (const l of links) {
    const srcId = normalizeEndpointId(l.source)
    const tgtId = normalizeEndpointId(l.target)
    const citation = typeof l.citation_text === 'string' ? l.citation_text.trim() : ''
    const citationSuffix = citation ? ` — « ${citation} »` : ''

    const sourceMissing = !srcId || !bookById.has(srcId)
    const targetMissing = !tgtId || !bookById.has(tgtId)

    if (sourceMissing) {
      const visibleTgt = tgtId && bookById.has(tgtId)
        ? bookById.get(tgtId)!.title || '(sans titre)'
        : resolveMissing(tgtId)
      out.push({
        id: `link-orphan-source:${l.id}`,
        kind: 'link-orphan-source',
        label: `${resolveMissing(srcId)} citait « ${visibleTgt} »${citationSuffix}`,
        details: 'l\'ressource qui citait n\'existe plus — supprime ce lien obsolète',
        action: { kind: 'delete-link', linkId: l.id },
      })
    } else if (targetMissing) {
      const visibleSrc = bookById.get(srcId as string)?.title || '(sans titre)'
      out.push({
        id: `link-orphan-target:${l.id}`,
        kind: 'link-orphan-target',
        label: `« ${visibleSrc} » cite ${resolveMissing(tgtId)}${citationSuffix}`,
        details: 'l\'ressource cité n\'existe plus — supprime ce lien ou recrée la référence',
        action: { kind: 'delete-link', linkId: l.id },
      })
    }
  }

  const byName = new Map<string, Author[]>()
  for (const a of authors) {
    const key = normalizeName(a.firstName, a.lastName)
    if (!key) continue
    const bucket = byName.get(key) ?? []
    bucket.push(a)
    byName.set(key, bucket)
  }
  for (const [key, bucket] of byName) {
    if (bucket.length > 1) {
      const display =
        bucket[0].firstName || bucket[0].lastName
          ? [bucket[0].firstName, bucket[0].lastName].filter(Boolean).join(' ')
          : key
      out.push({
        id: `duplicate-author:${key}`,
        kind: 'duplicate-author',
        label: `${bucket.length} auteur·ices nommé·es « ${display} »`,
        details: 'doublon probable — à vérifier',
      })
    }
  }

  return out
}

export function HistoryTabAnomalies() {
  const { books, authors, links } = useAppData()
  const { handleDeleteLink } = useAppMutations()
  const [expanded, setExpanded] = useState(false)
  const [confirmingLinkId, setConfirmingLinkId] = useState<string | null>(null)

  const { data: deletedBookTitles } = useQuery({
    queryKey: ['deleted_book_titles'],
    queryFn: loadDeletedBookTitles,
    staleTime: 60 * 1000,
  })

  const anomalies = useMemo(
    () => detectAnomalies(books, authors, links, deletedBookTitles),
    [books, authors, links, deletedBookTitles],
  )

  useEffect(() => {
    if (!confirmingLinkId) return
    const t = setTimeout(() => setConfirmingLinkId(null), 4000)
    return () => clearTimeout(t)
  }, [confirmingLinkId])

  // Fire-and-forget is safe here: the deleteLinkMutation does an optimistic
  // `setLinks((prev) => prev.filter(...))`, so the row disappears (and the
  // anomaly with it) before the network roundtrip. On server-side failure
  // the mutation's own `onError` fires a toast + `invalidate()` that brings
  // the link back — the anomaly resurfaces, nothing silent.
  const onDeleteLinkClick = (linkId: string) => {
    if (confirmingLinkId !== linkId) {
      setConfirmingLinkId(linkId)
      return
    }
    setConfirmingLinkId(null)
    handleDeleteLink?.(linkId)
  }

  if (anomalies.length === 0) return null

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-amber/30 bg-amber/5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="flex cursor-pointer items-center gap-2 px-4 py-2.5 transition-colors hover:bg-amber/10"
      >
        <AlertTriangle size={14} className="shrink-0 text-amber/80" />
        <span className="text-ui font-medium text-amber/90">
          {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} détectée
          {anomalies.length > 1 ? 's' : ''}
        </span>
        <span className="flex-1" />
        <ChevronRight
          size={13}
          className={clsx('text-amber/60 transition-transform', expanded && 'rotate-90')}
        />
      </div>

      {expanded && (
        <ul className="flex flex-col gap-1.5 border-t border-amber/20 px-4 py-2.5 text-caption">
          {anomalies.slice(0, 50).map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-amber/80">
              <AnomalyIcon kind={a.kind} />
              <div className="min-w-0 flex-1">
                <div className="wrap-break-word">{a.label}</div>
                {a.details && <div className="text-micro text-white/30">{a.details}</div>}
              </div>
              {a.action?.kind === 'delete-link' && (
                <Button
                  type="button"
                  variant="outline"
                  outlineWeight="muted"
                  tone={confirmingLinkId === a.action.linkId ? 'warning' : 'neutral'}
                  icon={<Trash2 size={11} />}
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation()
                    onDeleteLinkClick((a.action as { linkId: string }).linkId)
                  }}
                  className="shrink-0 text-caption"
                >
                  {confirmingLinkId === a.action.linkId ? 'Confirmer ?' : 'Supprimer'}
                </Button>
              )}
            </li>
          ))}
          {anomalies.length > 50 && (
            <li className="text-white/30">+ {anomalies.length - 50} autre(s)</li>
          )}
        </ul>
      )}
    </div>
  )
}

function AnomalyIcon({ kind }: { kind: AnomalyKind }) {
  switch (kind) {
    case 'book-empty-title':
    case 'book-no-author':
      return <BookOpen size={11} className="mt-0.5 shrink-0 text-amber/60" />
    case 'link-orphan-source':
    case 'link-orphan-target':
      return <Link2 size={11} className="mt-0.5 shrink-0 text-amber/60" />
    case 'duplicate-author':
      return <Users size={11} className="mt-0.5 shrink-0 text-amber/60" />
  }
}
