import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Author, Book } from '@/types/domain'
import { devWarn } from '@/common/utils/logger'
import {
  deleteAuthorRowById,
  insertAuthorRow,
  updateAuthorRowById,
} from '../api/graphDataApi'
import {
  authorToDbRow,
  type AxesColorMap,
  sanitizeAuthor,
} from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

type AuthorMutationsParams = {
  axesColorsRef: RefObject<AxesColorMap>
  authorsRef: RefObject<Author[]>
  setAuthors: Dispatch<SetStateAction<Author[]>>
  setBooks: Dispatch<SetStateAction<Book[]>>
}

export function useAuthorMutations({
  axesColorsRef,
  authorsRef,
  setAuthors,
  setBooks,
}: AuthorMutationsParams) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })

  const addAuthorMutation = useMutation({
    mutationFn: async (author: Author) => {
      const sanitized = sanitizeAuthor({ ...author, type: 'author' as const }, axesColorsRef.current!)
      const { error } = await insertAuthorRow(authorToDbRow(sanitized))
      if (error) throw new Error(error.message)
    },
    onMutate: (author) => {
      const sanitized = sanitizeAuthor({ ...author, type: 'author' as const }, axesColorsRef.current!)
      setAuthors((prev) => (prev.some((a) => a.id === sanitized.id) ? prev : [...prev, sanitized]))
    },
    onError: (err) => { devWarn('Erreur ajout auteur', err); toast.error("Impossible d'ajouter l'auteur·ice"); invalidate() },
  })

  const updateAuthorMutation = useMutation({
    mutationFn: async (updatedAuthor: Author) => {
      const sanitized = sanitizeAuthor({ ...updatedAuthor, type: 'author' as const }, axesColorsRef.current!)
      const { id, ...fields } = authorToDbRow(sanitized)
      const { error } = await updateAuthorRowById(id, fields)
      if (error) throw new Error(error.message)
    },
    onMutate: (updatedAuthor) => {
      const sanitized = sanitizeAuthor({ ...updatedAuthor, type: 'author' as const }, axesColorsRef.current!)
      setAuthors((prev) => prev.map((a) => (a.id === sanitized.id ? sanitized : a)))
    },
    onError: (err) => { devWarn('Erreur mise à jour auteur', err); toast.error("Impossible de modifier l'auteur·ice"); invalidate() },
  })

  const deleteAuthorMutation = useMutation({
    mutationFn: async (authorId: string) => {
      const { error } = await deleteAuthorRowById(authorId)
      if (error) throw new Error(error.message)
    },
    onMutate: (authorId) => {
      setAuthors((prev) => prev.filter((a) => a.id !== authorId))
      setBooks((prev) =>
        prev.map((b) =>
          b.authorIds?.includes(authorId)
            ? { ...b, authorIds: b.authorIds.filter((id) => id !== authorId) }
            : b
        )
      )
    },
    onError: (err) => { devWarn('Erreur suppression auteur', err); toast.error("Impossible de supprimer l'auteur·ice"); invalidate() },
  })

  const handleAddAuthor = useCallback(
    (author: Author) => addAuthorMutation.mutateAsync(author),
    [addAuthorMutation]
  )

  const handleUpdateAuthor = useCallback(
    (updatedAuthor: Author) => updateAuthorMutation.mutate(updatedAuthor),
    [updateAuthorMutation]
  )

  const handleDeleteAuthor = useCallback(
    (authorId: string) => {
      if (!authorId || !authorsRef.current!.some((a) => a.id === authorId)) return false
      deleteAuthorMutation.mutate(authorId)
      return true
    },
    [authorsRef, deleteAuthorMutation]
  )

  return { handleAddAuthor, handleUpdateAuthor, handleDeleteAuthor }
}
