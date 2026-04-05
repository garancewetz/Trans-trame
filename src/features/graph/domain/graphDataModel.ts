import { AXES_MIGRATION } from '@/common/utils/categories'
import type { Author, Book, Link } from '@/types/domain'

/** Entrées minimales pour persistance (hook / migration). */
export type BookRowInput = Partial<Book> & Pick<Book, 'id'>
export type AuthorRowInput = Partial<Author> & Pick<Author, 'id'>

// ── Types lignes DB (schéma Supabase, sans codegen) ───────────────────────────

export type DbBookRow = {
  id: string
  title?: string
  first_name?: string
  last_name?: string
  year?: number | null
  description?: string
  axes?: string[]
  original_title?: string | null
}

export type DbAuthorRow = {
  id: string
  first_name?: string
  last_name?: string
  axes?: string[]
}

export type DbLinkRow = {
  id: string
  source_id?: string
  target_id?: string
  citation_text?: string
  edition?: string
  page?: string
  context?: string
}

export type AxesColorMap = Record<string, string>

// ── Helpers: sanitisation ──────────────────────────────────────────────────────

export function sanitizeAxes(axes: unknown, axesColors: AxesColorMap): string[] {
  if (!Array.isArray(axes)) return []
  const allowed = new Set(Object.keys(axesColors))
  return axes
    .map((a) => (typeof a === 'string' ? (AXES_MIGRATION[a] ?? a) : String(a)))
    .filter((a): a is string => typeof a === 'string' && allowed.has(a))
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
    firstName: row.first_name,
    lastName: row.last_name,
    authorIds: authorIds ?? [],
    year: row.year ?? null,
    description: row.description || '',
    axes: row.axes || [],
    originalTitle: row.original_title ?? null,
  }
}

export function dbAuthorToNode(row: DbAuthorRow): Author {
  return {
    id: row.id,
    type: 'author',
    firstName: row.first_name,
    lastName: row.last_name,
    axes: row.axes || [],
  }
}

export function dbLinkToLink(row: DbLinkRow): Link {
  return {
    id: row.id,
    source: row.source_id ?? '',
    target: row.target_id ?? '',
    citation_text: row.citation_text || '',
    edition: row.edition || '',
    page: row.page || '',
    context: row.context || '',
  }
}

export function bookToDbRow(node: BookRowInput) {
  return {
    id: node.id,
    title: node.title ?? '',
    first_name: node.firstName || '',
    last_name: node.lastName || '',
    year: node.year ?? null,
    description: node.description || '',
    axes: node.axes || [],
    original_title: node.originalTitle ?? null,
  }
}

export function authorToDbRow(author: AuthorRowInput) {
  return {
    id: author.id,
    first_name: author.firstName || '',
    last_name: author.lastName || '',
    axes: author.axes || [],
  }
}
