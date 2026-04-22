export type AxisId = string

export type BookId = string
export type AuthorId = string
export type LinkId = string

/** Statut de revue d'une entité. NULL = neutre, 'warning' = à vérifier. */
export type EntityStatus = 'warning' | null

export type Book = {
  id: BookId
  type: 'book'
  title: string
  originalTitle?: string | null
  year?: number | null
  description?: string
  todo?: string | null
  status?: EntityStatus
  importSourceId?: string | null
  resourceType?: string
  axes?: AxisId[]
  authorIds?: AuthorId[]

  // legacy — à supprimer une fois les fallbacks authorUtils nettoyés
  firstName?: string
  lastName?: string
} & Record<string, unknown>

export type Author = {
  id: AuthorId
  type: 'author'
  firstName?: string
  lastName?: string
  todo?: string | null
  status?: EntityStatus
  axes?: AxisId[]
} & Record<string, unknown>

export type LinkCitationId = string

export type LinkCitation = {
  id: LinkCitationId
  link_id: LinkId
  citation_text: string
  edition: string
  page: string
  context: string
  created_at?: string | null
}

/**
 * A citation edge between two books.
 *
 * Invariant (enforced at DB level since migration 20260418_link_citations_subtable):
 * at most one non-deleted `Link` exists per (source, target) couple. Multiple
 * citations (pages/editions/contexts) live as children in `citations`.
 */
export type Link = {
  id: LinkId
  source: BookId | { id: BookId } | unknown
  target: BookId | { id: BookId } | unknown
  citations: LinkCitation[]
  type?: string
  provenance?: 'manual'
} & Record<string, unknown>

// Caller input for "create a link + optional initial citation". The citation
// fields live on this input shape rather than on `Link` because every
// user-facing "add link" action carries at most one citation inline at
// creation time. Additional citations go through useCitationMutations.
export type CreateLinkInput = {
  id?: string
  source: unknown
  target: unknown
  citation_text?: string
  edition?: string
  page?: string
  context?: string
}

export type GraphData = {
  nodes: Book[]
  links: Link[]
}

/** Plage d'années sélectionnée sur la timeline (état utilisateur, peut être partiellement hors bornes avant clamp). */
export type TimelineRange = { start: number; end: number }

