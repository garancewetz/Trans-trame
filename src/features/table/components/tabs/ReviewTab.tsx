import { useMemo } from 'react'
import { Flag } from 'lucide-react'
import { StatusFlag } from '@/common/components/StatusFlag'
import { authorName, bookAuthorDisplay } from '@/common/utils/authorUtils'
import { TodoNotePopover } from '../TodoNotePopover'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Author, AuthorId, Book, BookId, EntityStatus } from '@/types/domain'

type Props = {
  books: Book[]
  authors: Author[]
  authorsMap: Map<string, AuthorNode>
  onUpdateBook?: (book: Book) => unknown
  onUpdateAuthor?: (author: Author) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
}

/** Entités (livres ou auteur·ices) dont l'utilisateur·ice a explicitement marqué
 *  qu'elles nécessitent une relecture : drapeau `status='warning'` ou note `todo`. */
export function ReviewTab({
  books,
  authors,
  authorsMap,
  onUpdateBook,
  onUpdateAuthor,
  onOpenWorkDetail,
  onFocusAuthorInAuthorsTab,
}: Props) {
  const reviewBooks = useMemo(
    () => books.filter((b) => b.status === 'warning' || b.todo),
    [books],
  )
  const reviewAuthors = useMemo(
    () => authors.filter((a) => a.status === 'warning' || a.todo),
    [authors],
  )

  const total = reviewBooks.length + reviewAuthors.length

  if (total === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-white/35">
        <div className="flex flex-col items-center gap-2">
          <Flag size={20} className="text-white/20" />
          <p className="font-mono text-ui">Rien à relire ✓</p>
          <p className="text-caption text-white/25">
            Les ouvrages et auteur·ices marqué·es ⚑ ou avec une note apparaîtront ici.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {reviewBooks.length > 0 && (
          <Section title="Ouvrages" count={reviewBooks.length}>
            {reviewBooks.map((b) => (
              <BookReviewRow
                key={b.id}
                book={b}
                authorsMap={authorsMap}
                onUpdateBook={onUpdateBook}
                onOpen={onOpenWorkDetail ? () => onOpenWorkDetail(b.id) : undefined}
              />
            ))}
          </Section>
        )}

        {reviewAuthors.length > 0 && (
          <Section title="Auteur·ices" count={reviewAuthors.length}>
            {reviewAuthors.map((a) => (
              <AuthorReviewRow
                key={a.id}
                author={a}
                onUpdateAuthor={onUpdateAuthor}
                onOpen={onFocusAuthorInAuthorsTab ? () => onFocusAuthorInAuthorsTab(a.id) : undefined}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Internals ──────────────────────────────────────────────────────────────

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <header className="flex items-baseline gap-2 border-b border-white/6 pb-1.5">
        <h2 className="font-mono text-ui uppercase tracking-wider text-white/60">{title}</h2>
        <span className="font-mono text-caption tabular-nums text-white/30">({count})</span>
      </header>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  )
}

function RowShell({
  onOpen,
  children,
}: {
  onOpen?: () => void
  children: React.ReactNode
}) {
  return (
    <li className="group flex items-center gap-2 rounded-md border border-white/4 bg-white/1.5 px-3 py-2 transition-colors hover:bg-white/3.5">
      <div
        className={onOpen ? 'min-w-0 flex-1 cursor-pointer' : 'min-w-0 flex-1'}
        onClick={onOpen}
      >
        {children}
      </div>
    </li>
  )
}

function BookReviewRow({
  book,
  authorsMap,
  onUpdateBook,
  onOpen,
}: {
  book: Book
  authorsMap: Map<string, AuthorNode>
  onUpdateBook?: (book: Book) => unknown
  onOpen?: () => void
}) {
  const authors = bookAuthorDisplay(book, authorsMap) || '—'
  return (
    <RowShell onOpen={onOpen}>
      <div className="flex items-center gap-2">
        <span className="truncate text-white/80 hover:text-white">{book.title || '(sans titre)'}</span>
        <span className="shrink-0 font-mono text-caption tabular-nums text-white/30">
          {book.year ?? '—'}
        </span>
        {book.todo && (
          <TodoNotePopover
            note={book.todo}
            onClear={onUpdateBook ? () => onUpdateBook({ ...book, todo: null }) : undefined}
          />
        )}
        {onUpdateBook && (
          <StatusFlag
            status={book.status}
            onChange={(next: EntityStatus) => onUpdateBook({ ...book, status: next })}
          />
        )}
      </div>
      <div className="mt-0.5 truncate text-caption text-white/40">{authors}</div>
    </RowShell>
  )
}

function AuthorReviewRow({
  author,
  onUpdateAuthor,
  onOpen,
}: {
  author: Author
  onUpdateAuthor?: (author: Author) => unknown
  onOpen?: () => void
}) {
  return (
    <RowShell onOpen={onOpen}>
      <div className="flex items-center gap-2">
        <span className="truncate text-white/80 hover:text-white">{authorName(author) || '(sans nom)'}</span>
        {author.todo && (
          <TodoNotePopover
            note={author.todo}
            onClear={onUpdateAuthor ? () => onUpdateAuthor({ ...author, todo: null }) : undefined}
          />
        )}
        {onUpdateAuthor && (
          <StatusFlag
            status={author.status}
            onChange={(next: EntityStatus) => onUpdateAuthor({ ...author, status: next })}
          />
        )}
      </div>
    </RowShell>
  )
}

/** Compteur centralisé (éviter les duplications dans topbar + autres). */
export function countReviewItems(books: Book[], authors: Author[]): number {
  let n = 0
  for (const b of books) if (b.status === 'warning' || b.todo) n++
  for (const a of authors) if (a.status === 'warning' || a.todo) n++
  return n
}
