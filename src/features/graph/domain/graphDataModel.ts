import { AXES_MIGRATION } from '@/common/utils/categories'
import type { Author, Book, Link, LinkCitation } from '@/types/domain'

/** Entrées minimales pour persistance (hook / migration). */
type BookRowInput = Partial<Book> & Pick<Book, 'id'>
type AuthorRowInput = Partial<Author> & Pick<Author, 'id'>

// ── Types lignes DB (schéma Supabase, sans codegen) ───────────────────────────

type DbBookRow = {
  id: string
  title?: string
  resource_type?: string
  year?: number | null
  description?: string
  todo?: string | null
  status?: string | null
  import_source_id?: string | null
  axes?: string[]
  original_title?: string | null
  created_at?: string | null
}

type DbAuthorRow = {
  id: string
  first_name?: string
  last_name?: string
  todo?: string | null
  status?: string | null
  axes?: string[]
  created_at?: string | null
}

type DbLinkRow = {
  id: string
  source_id?: string
  target_id?: string
  /** @deprecated kept for rollback safety; citations live in link_citations. */
  citation_text?: string
  /** @deprecated — see citation_text note. */
  edition?: string
  /** @deprecated — see citation_text note. */
  page?: string
  /** @deprecated — see citation_text note. */
  context?: string
}

type DbLinkCitationRow = {
  id: string
  link_id: string
  citation_text?: string
  edition?: string
  page?: string
  context?: string
  created_at?: string | null
}

export type AxesColorMap = Record<string, string>

// ── Helpers: sanitisation ──────────────────────────────────────────────────────

function sanitizeAxes(axes: unknown, axesColors: AxesColorMap): string[] {
  if (!Array.isArray(axes)) return []
  const allowed = new Set(Object.keys(axesColors))
  return axes
    .map((a) => (typeof a === 'string' ? (AXES_MIGRATION[a] ?? a) : String(a)))
    .filter((a): a is string =>
      typeof a === 'string' && (allowed.has(a) || a.startsWith('UNCATEGORIZED:'))
    )
}

export function sanitizeBook<T extends Record<string, unknown>>(node: T, axesColors: AxesColorMap): T {
  if (!node || typeof node !== 'object') return node
  return { ...node, axes: sanitizeAxes(node.axes, axesColors) }
}

export function sanitizeAuthor<T extends Record<string, unknown>>(author: T, axesColors: AxesColorMap): T {
  if (!author || typeof author !== 'object') return author
  return { ...author, axes: sanitizeAxes(author.axes, axesColors) }
}

export function normalizeId(v: unknown): unknown {
  if (v && typeof v === 'object' && 'id' in v) return Reflect.get(v, 'id')
  return v
}

export function normalizeEndpointId(v: unknown): string | null {
  const raw = normalizeId(v)
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  return null
}

// ── Helpers: conversion DB ↔ app ───────────────────────────────────────────────

export function dbBookToNode(row: DbBookRow, authorIds?: string[]): Book {
  return {
    id: row.id,
    type: 'book',
    title: row.title ?? '',
    resourceType: row.resource_type ?? 'book',
    authorIds: authorIds ?? [],
    year: row.year ?? null,
    description: row.description || '',
    todo: row.todo ?? null,
    status: row.status === 'warning' ? 'warning' : null,
    importSourceId: row.import_source_id ?? null,
    axes: row.axes || [],
    originalTitle: row.original_title ?? null,
    created_at: row.created_at ?? null,
  }
}

export function dbAuthorToNode(row: DbAuthorRow): Author {
  return {
    id: row.id,
    type: 'author',
    firstName: row.first_name,
    lastName: row.last_name,
    todo: row.todo ?? null,
    status: row.status === 'warning' ? 'warning' : null,
    axes: row.axes || [],
    created_at: row.created_at ?? null,
  }
}

export function dbLinkCitationToCitation(row: DbLinkCitationRow): LinkCitation {
  return {
    id: row.id,
    link_id: row.link_id,
    citation_text: row.citation_text || '',
    edition: row.edition || '',
    page: row.page || '',
    context: row.context || '',
    created_at: row.created_at ?? null,
  }
}

/**
 * Build a Link object with its citations array attached, and flat fields
 * mirrored from citations[0]. The mirror is read-only compat — mutations on
 * citation fields must go through the citation CRUD, not updateLinkRowById.
 */
export function dbLinkToLink(row: DbLinkRow, citations: LinkCitation[] = []): Link {
  const primary = citations[0]
  return {
    id: row.id,
    source: row.source_id ?? '',
    target: row.target_id ?? '',
    citations,
    citation_text: primary?.citation_text ?? '',
    edition: primary?.edition ?? '',
    page: primary?.page ?? '',
    context: primary?.context ?? '',
  }
}

export function bookToDbRow(node: BookRowInput) {
  return {
    id: node.id,
    title: node.title ?? '',
    resource_type: node.resourceType ?? 'book',
    year: node.year != null ? node.year : null,
    description: node.description || '',
    todo: node.todo ?? null,
    status: node.status ?? null,
    axes: node.axes || [],
    original_title: node.originalTitle ?? null,
  }
}

export function authorToDbRow(author: AuthorRowInput) {
  return {
    id: author.id,
    first_name: author.firstName || '',
    last_name: author.lastName || '',
    todo: author.todo ?? null,
    status: author.status ?? null,
    axes: author.axes || [],
  }
}
