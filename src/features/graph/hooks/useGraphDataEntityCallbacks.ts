import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Author, Book, Link } from '@/types/domain'
import { devWarn } from '@/common/utils/logger'
import {
  deleteAuthorRowById,
  deleteBookRowById,
  deleteLinkRowById,
  insertAuthorRow,
  insertBookRow,
  insertBookAuthors,
  insertLinkRow,
  setBookAuthors,
  updateAuthorRowById,
  updateBookRowById,
  updateLinkRowById,
} from '../api/graphDataApi'
import {
  authorToDbRow,
  bookToDbRow,
  type AxesColorMap,
  normalizeId,
  sanitizeAuthor,
  sanitizeBook,
} from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

type NewLink = {
  id: string
  source: string
  target: string
  citation_text: string
  edition: string
  page: string
  context: string
}

type Params = {
  axesColorsRef: RefObject<AxesColorMap>
  booksRef: RefObject<Book[]>
  authorsRef: RefObject<Author[]>
  linksRef: RefObject<Link[]>
  setBooks: Dispatch<SetStateAction<Book[]>>
  setAuthors: Dispatch<SetStateAction<Author[]>>
  setLinks: Dispatch<SetStateAction<Link[]>>
}

export function useGraphDataEntityCallbacks({
  axesColorsRef,
  booksRef,
  authorsRef,
  linksRef,
  setBooks,
  setAuthors,
  setLinks,
}: Params) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })

  // ── Books ────────────────────────────────────────────────────────────────────

  const addBookMutation = useMutation({
    mutationFn: async (book: Book) => {
      const sanitized = sanitizeBook({ ...book, type: 'book' as const }, axesColorsRef.current!)
      const { error } = await insertBookRow(bookToDbRow(sanitized))
      if (error) throw new Error(error.message)
      await insertBookAuthors(sanitized.id, sanitized.authorIds ?? [])
    },
    onMutate: (book) => {
      const sanitized = sanitizeBook({ ...book, type: 'book' as const }, axesColorsRef.current!)
      setBooks((prev) => (prev.some((n) => n.id === sanitized.id) ? prev : [...prev, sanitized]))
    },
    onError: (err) => { devWarn('Erreur ajout livre', err); invalidate() },
    onSuccess: invalidate,
  })

  const updateBookMutation = useMutation({
    mutationFn: async (updatedNode: Book) => {
      const sanitized = sanitizeBook({ ...updatedNode, type: 'book' as const }, axesColorsRef.current!)
      const { id, ...fields } = bookToDbRow(sanitized)
      const { error } = await updateBookRowById(id, fields)
      if (error) throw new Error(error.message)
      await setBookAuthors(id, sanitized.authorIds ?? [])
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
    onError: (err) => { devWarn('Erreur mise à jour livre', err); invalidate() },
    onSuccess: invalidate,
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
    onError: (err) => { devWarn('Erreur suppression livre', err); invalidate() },
    onSuccess: invalidate,
  })

  // ── Authors ──────────────────────────────────────────────────────────────────

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
    onError: (err) => { devWarn('Erreur ajout auteur', err); invalidate() },
    onSuccess: invalidate,
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
    onError: (err) => { devWarn('Erreur mise à jour auteur', err); invalidate() },
    onSuccess: invalidate,
  })

  const deleteAuthorMutation = useMutation({
    mutationFn: async (authorId: string) => {
      // CASCADE on book_authors handles junction cleanup automatically
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
    onError: (err) => { devWarn('Erreur suppression auteur', err); invalidate() },
    onSuccess: invalidate,
  })

  // ── Links ────────────────────────────────────────────────────────────────────

  const addLinkMutation = useMutation({
    mutationFn: async (newLink: NewLink) => {
      const { error } = await insertLinkRow({
        id: newLink.id,
        source_id: newLink.source,
        target_id: newLink.target,
        citation_text: newLink.citation_text,
        edition: newLink.edition,
        page: newLink.page,
        context: newLink.context,
      })
      if (error) throw new Error(error.message)
    },
    onMutate: (newLink) => {
      setLinks((prev) => [...prev, newLink])
    },
    onError: (err) => { devWarn('Erreur ajout lien', err); invalidate() },
    onSuccess: invalidate,
  })

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await deleteLinkRowById(linkId)
      if (error) throw new Error(error.message)
    },
    onMutate: (linkId) => {
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    },
    onError: (err) => { devWarn('Erreur suppression lien', err); invalidate() },
    onSuccess: invalidate,
  })

  const updateLinkMutation = useMutation({
    mutationFn: async ({ linkId, updatedFields }: { linkId: string; updatedFields: Record<string, unknown> }) => {
      const { error } = await updateLinkRowById(linkId, updatedFields)
      if (error) throw new Error(error.message)
    },
    onMutate: ({ linkId, updatedFields }) => {
      setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, ...updatedFields } : l)))
    },
    onError: (err) => { devWarn('Erreur mise à jour lien', err); invalidate() },
    onSuccess: invalidate,
  })

  // ── Public API (same interface as before) ────────────────────────────────────

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

  const handleAddAuthor = useCallback(
    (author: Author) => addAuthorMutation.mutate(author),
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

  const handleAddLink = useCallback(
    (link: Link | (Partial<Link> & Pick<Link, 'source' | 'target'>)) => {
      const srcId = normalizeId((link as Link).source) as string
      const tgtId = normalizeId((link as Link).target) as string
      const citationText = link.citation_text || ''
      // Deduplicate: skip if an identical link already exists in local state
      const isDuplicate = linksRef.current!.some((l) => {
        const s = normalizeId(l.source)
        const t = normalizeId(l.target)
        return s === srcId && t === tgtId && l.citation_text === citationText
      })
      if (isDuplicate) return
      addLinkMutation.mutate({
        id: (link.id as string) || crypto.randomUUID(),
        source: srcId,
        target: tgtId,
        citation_text: citationText,
        edition: link.edition || '',
        page: link.page || '',
        context: link.context || '',
      })
    },
    [linksRef, addLinkMutation]
  )

  const handleDeleteLink = useCallback(
    (linkId: string) => deleteLinkMutation.mutate(linkId),
    [deleteLinkMutation]
  )

  const handleUpdateLink = useCallback(
    (linkId: string, updatedFields: Record<string, unknown>) =>
      updateLinkMutation.mutate({ linkId, updatedFields }),
    [updateLinkMutation]
  )

  return {
    handleAddBook,
    handleUpdateBook,
    handleDeleteBook,
    handleAddAuthor,
    handleUpdateAuthor,
    handleDeleteAuthor,
    handleAddLink,
    handleDeleteLink,
    handleUpdateLink,
  }
}
