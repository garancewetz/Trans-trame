export type AxisId = string

export type BookId = string
export type AuthorId = string
export type LinkId = string

export type Book = {
  id: BookId
  type: 'book'
  title: string
  originalTitle?: string | null
  year?: number | null
  description?: string
  todo?: string | null
  importSourceId?: string | null
  axes?: AxisId[]
  authorIds?: AuthorId[]

  // legacy — conservé pour rétrocompatibilité
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
  axes?: AxisId[]
} & Record<string, unknown>

export type Link = {
  id: LinkId
  source: BookId | { id: BookId } | unknown
  target: BookId | { id: BookId } | unknown
  citation_text?: string
  edition?: string
  page?: string
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

