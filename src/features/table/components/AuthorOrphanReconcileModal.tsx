import { useMemo, useState } from 'react'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { findMatches } from '../authorOrphanMatching'
import type { OrphanEntry } from '../authorOrphanMatching'
import { AuthorOrphanReviewList } from './AuthorOrphanReviewList'

type Props = {
  open: boolean
  orphanedAuthors: Author[]
  books: Book[]
  authorsMap: Map<string, AuthorNode>
  onLinkAuthorToBook: (authorId: AuthorId, book: Book) => void
  onClose: () => void
}

export function AuthorOrphanReconcileModal({
  open,
  orphanedAuthors,
  books,
  authorsMap,
  onLinkAuthorToBook,
  onClose,
}: Props) {
  const [selections, setSelections] = useState<Map<AuthorId, Set<BookId>>>(new Map())

  const entries = useMemo<OrphanEntry[]>(() => {
    return orphanedAuthors.map((author) => ({
      author,
      matches: findMatches(author, books),
    }))
  }, [orphanedAuthors, books])

  // Auto-select high-confidence matches on first render / when entries change
  const [prevKey, setPrevKey] = useState<Author[] | null>(null)
  if (open && prevKey !== orphanedAuthors) {
    setPrevKey(orphanedAuthors)
    const init = new Map<AuthorId, Set<BookId>>()
    for (const e of entries) {
      const highMatches = e.matches.filter((m) => m.confidence === 'high')
      if (highMatches.length > 0) {
        init.set(e.author.id, new Set(highMatches.map((m) => m.book.id)))
      }
    }
    setSelections(init)
  } else if (!open && prevKey) {
    setPrevKey(null)
  }

  const withMatches = entries.filter((e) => e.matches.length > 0)
  const withoutMatches = entries.filter((e) => e.matches.length === 0)
  const totalSelected = [...selections.values()].reduce((acc, s) => acc + s.size, 0)

  const toggleSelection = (authorId: AuthorId, bookId: BookId) => {
    setSelections((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(authorId) || [])
      if (set.has(bookId)) set.delete(bookId)
      else set.add(bookId)
      if (set.size === 0) next.delete(authorId)
      else next.set(authorId, set)
      return next
    })
  }

  const handleApply = () => {
    if (totalSelected === 0) return
    for (const [authorId, bookIds] of selections) {
      for (const bookId of bookIds) {
        const book = books.find((b) => b.id === bookId)
        if (book) onLinkAuthorToBook(authorId, book)
      }
    }
    toast.success(`${totalSelected} liaison${totalSelected > 1 ? 's' : ''} appliquée${totalSelected > 1 ? 's' : ''}.`)
    setSelections(new Map())
    onClose()
  }

  const handleClose = () => {
    setSelections(new Map())
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Réconcilier les auteur·ices orphelin·es"
      onClose={handleClose}
      zIndex="z-60"
      maxWidth="max-w-2xl"
      subtitle={
        <>
          <span className="font-semibold text-white">
            {orphanedAuthors.length} auteur·ice{orphanedAuthors.length > 1 ? 's' : ''}
          </span>{' '}
          sans ouvrage. Correspondances trouvées via les champs legacy des ouvrages.
        </>
      }
      footer={
        <>
          <Button type="button" onClick={handleClose} variant="surface">
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={totalSelected === 0}
            variant="outline"
            outlineWeight="strong"
            tone="merge"
            active={totalSelected > 0}
            icon={<Link2 size={13} />}
          >
            Relier ({totalSelected})
          </Button>
        </>
      }
    >
      <AuthorOrphanReviewList
        withMatches={withMatches}
        withoutMatches={withoutMatches}
        selections={selections}
        authorsMap={authorsMap}
        onToggle={toggleSelection}
      />
    </Modal>
  )
}
