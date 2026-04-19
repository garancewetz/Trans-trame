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

  // react-force-graph positions (mutées par la lib)
  x?: number
  y?: number
  fx?: number
  fy?: number
  vx?: number
  vy?: number
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
 *
 * The flat fields (citation_text / edition / page / context) are HYDRATED from
 * `citations[0]` at fetch time — they are a read-only compatibility mirror for
 * legacy code paths, NOT the source of truth. Writes go through the citation
 * mutations (`useCitationMutations`), never through `updateLinkRowById` for
 * those fields. A follow-up migration will drop the flat columns from the DB
 * once every read site is migrated to `citations`.
 */
export type Link = {
  id: LinkId
  source: BookId | { id: BookId } | unknown
  target: BookId | { id: BookId } | unknown
  citations: LinkCitation[]
  /** @deprecated Mirror of citations[0].citation_text — read only. */
  citation_text?: string
  /** @deprecated Mirror of citations[0].edition — read only. */
  edition?: string
  /** @deprecated Mirror of citations[0].page — read only. */
  page?: string
  /** @deprecated Mirror of citations[0].context — read only. */
  context?: string
  type?: string
  provenance?: 'manual'
} & Record<string, unknown>

export type GraphData = {
  nodes: Book[]
  links: Link[]
}

/** Plage d'années sélectionnée sur la timeline (état utilisateur, peut être partiellement hors bornes avant clamp). */
export type TimelineRange = { start: number; end: number }

