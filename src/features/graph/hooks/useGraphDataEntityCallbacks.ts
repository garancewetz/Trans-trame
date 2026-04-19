import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { Author, Book, Link } from '@/types/domain'
import type { AxesColorMap } from '../domain/graphDataModel'
import { useBookMutations } from './useBookMutations'
import { useAuthorMutations } from './useAuthorMutations'
import { useCitationMutations } from './useCitationMutations'
import { useLinkMutations } from './useLinkMutations'

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
  const bookMutations = useBookMutations({ axesColorsRef, booksRef, linksRef, setBooks, setLinks })
  const authorMutations = useAuthorMutations({ axesColorsRef, authorsRef, setAuthors, setBooks })
  const linkMutations = useLinkMutations({ linksRef, setLinks })
  const citationMutations = useCitationMutations({ linksRef, setLinks })

  return {
    ...bookMutations,
    ...authorMutations,
    ...linkMutations,
    ...citationMutations,
  }
}
