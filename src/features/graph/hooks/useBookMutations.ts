import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Book, Link } from '@/types/domain'
import { devWarn } from '@/common/utils/logger'
import {
  deleteBookRowById,
  insertBookRow,
  insertBookAuthors,
  setBookAuthors,
  updateBookRowById,
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
  setBooks: Dispatch<SetStateAction<Book[]>>
  setLinks: Dispatch<SetStateAction<Link[]>>
}

export function useBookMutations({
  axesColorsRef,
  booksRef,
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
      const { error } = await insertBookRow(row)
      if (error) throw new Error(error.message)
      const authorIds = sanitized.authorIds ?? []
      if (authorIds.length > 0) {
        const result = await insertBookAuthors(sanitized.id, authorIds)
        if (result && 'error' in result && result.error) {
          throw new Error(result.error.message || 'Erreur jointure auteur·ices')
        }
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
      const { error } = await updateBookRowById(id, fields)
      if (error) throw new Error(error.message)
      // Only touch the join table if authorIds was explicitly provided.
      // Without this guard, an update missing the field would wipe the
      // book↔author associations and re-create the legacy state.
      if (Object.prototype.hasOwnProperty.call(updatedNode, 'authorIds')) {
        const result = await setBookAuthors(id, updatedNode.authorIds ?? [])
        if (result && 'error' in result && result.error) {
          throw new Error(result.error.message || 'Erreur jointure auteur·ices')
        }
      }
    },
    onMutate: (updatedNode) => {
      const sanitized = sanitizeBook({ ...updatedNode, type: 'book' as const }, axesColorsRef.current!)
      setBooks((prev) =>
        prev.map((n) => {
          if (n.id !== sanitized.id) return n
          Object.assign(n, sanitized)
          return n
        })
      )
    },
    onError: (err) => { devWarn('Erreur mise à jour livre', err); toast.error('Impossible de modifier le livre'); invalidate() },
  })

  const deleteBookMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const { error } = await deleteBookRowById(nodeId)
      if (error) throw new Error(error.message)
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
