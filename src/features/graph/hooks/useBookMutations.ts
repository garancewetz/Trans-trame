import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Book, Link } from '@/types/domain'
import { devWarn } from '@/common/utils/logger'
import { ensureOk } from '@/core/supabaseErrors'
import {
  deleteResourceRowById,
  deleteLinkRowsByIds,
  insertResourceRow,
  insertResourceAuthors,
  setResourceAuthors,
  updateResourceRowById,
} from '../api/graphDataApi'
import {
  bookToDbRow,
  type AxesColorMap,
  normalizeId,
  sanitizeBook,
} from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

type BookMutationsParams = {
  axesColorsRef: RefObject<AxesColorMap>
  booksRef: RefObject<Book[]>
  linksRef: RefObject<Link[]>
  setBooks: Dispatch<SetStateAction<Book[]>>
  setLinks: Dispatch<SetStateAction<Link[]>>
}

export function useBookMutations({
  axesColorsRef,
  booksRef,
  linksRef,
  setBooks,
  setLinks,
}: BookMutationsParams) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })

  const addBookMutation = useMutation({
    mutationFn: async (book: Book) => {
      const sanitized = sanitizeBook({ ...book, type: 'book' as const }, axesColorsRef.current!)
      const row = bookToDbRow(sanitized)
      if (sanitized.importSourceId) (row as Record<string, unknown>).import_source_id = sanitized.importSourceId
      ensureOk(await insertResourceRow(row), 'ajout ressource')
      const authorIds = sanitized.authorIds ?? []
      if (authorIds.length > 0) {
        ensureOk(await insertResourceAuthors(sanitized.id, authorIds), 'jointure auteur·ices')
      }
    },
    onMutate: (book) => {
      const sanitized = sanitizeBook({ ...book, type: 'book' as const }, axesColorsRef.current!)
      setBooks((prev) => (prev.some((n) => n.id === sanitized.id) ? prev : [...prev, sanitized]))
    },
    onError: (err) => { devWarn('Erreur ajout livre', err); toast.error("Impossible d'ajouter le livre"); invalidate() },
  })

  const updateBookMutation = useMutation({
    mutationFn: async (updatedNode: Book) => {
      const sanitized = sanitizeBook({ ...updatedNode, type: 'book' as const }, axesColorsRef.current!)
      const { id, ...fields } = bookToDbRow(sanitized)
      ensureOk(await updateResourceRowById(id, fields), 'mise à jour ressource')
      // Only touch the join table if authorIds was explicitly provided.
      // Without this guard, an update missing the field would wipe the
      // resource↔author associations and re-create the legacy state.
      if (Object.prototype.hasOwnProperty.call(updatedNode, 'authorIds')) {
        const result = await setResourceAuthors(id, updatedNode.authorIds ?? [])
        if (result && 'error' in result && result.error) {
          throw new Error(result.error.message || 'Erreur jointure auteur·ices')
        }
      }
    },
    onMutate: (updatedNode) => {
      const sanitized = sanitizeBook({ ...updatedNode, type: 'book' as const }, axesColorsRef.current!)
      setBooks((prev) =>
        prev.map((n) => (n.id === sanitized.id ? { ...n, ...sanitized } : n))
      )
    },
    onError: (err) => { devWarn('Erreur mise à jour livre', err); toast.error('Impossible de modifier le livre'); invalidate() },
  })

  const deleteBookMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      // Cascade: soft-delete incoming/outgoing citation links first, then the
      // book itself. Without this the book row is soft-deleted but the links
      // remain active in the DB — they come back on the next refetch and the
      // anomaly detector flags them as "link pointing to a disappeared work".
      // Links first (not book first) so that a partial failure leaves the
      // book still visible + retryable rather than an invisible book with
      // dangling citations.
      const linkIdsToRemove = (linksRef.current ?? [])
        .filter((l) => {
          const s = normalizeId(l.source)
          const t = normalizeId(l.target)
          return s === nodeId || t === nodeId
        })
        .map((l) => l.id)
      if (linkIdsToRemove.length > 0) {
        ensureOk(await deleteLinkRowsByIds(linkIdsToRemove), 'suppression liens du livre')
      }
      ensureOk(await deleteResourceRowById(nodeId), 'suppression ressource')
    },
    onMutate: (nodeId) => {
      setBooks((prev) => prev.filter((n) => n.id !== nodeId))
      setLinks((prev) =>
        prev.filter((l) => normalizeId(l.source) !== nodeId && normalizeId(l.target) !== nodeId)
      )
    },
    onError: (err) => { devWarn('Erreur suppression livre', err); toast.error('Impossible de supprimer le livre'); invalidate() },
  })

  const handleAddBook = useCallback(
    (book: Book | (Partial<Book> & Pick<Book, 'id' | 'title'>)) =>
      addBookMutation.mutateAsync(book as Book),
    [addBookMutation]
  )

  const handleUpdateBook = useCallback(
    (updatedNode: Book) => updateBookMutation.mutate(updatedNode),
    [updateBookMutation]
  )

  const handleDeleteBook = useCallback(
    (nodeId: string) => {
      if (!nodeId || !booksRef.current!.some((n) => n.id === nodeId)) return false
      deleteBookMutation.mutate(nodeId)
      return true
    },
    [booksRef, deleteBookMutation]
  )

  return { handleAddBook, handleUpdateBook, handleDeleteBook }
}
