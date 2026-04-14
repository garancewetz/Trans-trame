import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Link2 } from 'lucide-react'
import type { Author, AuthorId, Book, BookId } from '@/types/domain'
import { authorName, bookAuthorDisplay, type AuthorNode } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { Modal } from '@/common/components/ui/Modal'
import { ConfirmButton } from '@/common/components/ui/ConfirmButton'

type Match = {
  book: Book
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

type OrphanEntry = {
  author: Author
  matches: Match[]
}

type Props = {
  open: boolean
  orphanedAuthors: Author[]
  books: Book[]
  authorsMap: Map<string, AuthorNode>
  onLinkAuthorToBook: (authorId: AuthorId, book: Book) => void
  onClose: () => void
}

// ── Matching helpers ──────────────────────────────────────────────────────

function norm(s: unknown): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (Math.abs(a.length - b.length) > 2) return 3
  const m = a.length
  const n = b.length
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1])
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function findMatches(author: Author, books: Book[]): Match[] {
  const authFn = norm(author.firstName)
  const authLn = norm(author.lastName)
  if (!authLn) return []

  const matches: Match[] = []

  for (const book of books) {
    // Skip books that already link this author
    if (book.authorIds?.includes(author.id)) continue

    const bookFn = norm(book.firstName)
    const bookLn = norm(book.lastName)

    // Exact match on both legacy fields
    if (bookLn && authLn === bookLn && authFn && bookFn && authFn === bookFn) {
      matches.push({ book, confidence: 'high', reason: 'Correspondance exacte (champs legacy)' })
      continue
    }

    // Same lastName, missing or different firstName
    if (bookLn && authLn === bookLn) {
      matches.push({ book, confidence: 'medium', reason: 'Même nom de famille (champs legacy)' })
      continue
    }

    // Fuzzy match on lastName (Levenshtein ≤ 1)
    if (bookLn && authLn.length >= 3 && levenshtein(authLn, bookLn) <= 1) {
      matches.push({ book, confidence: 'low', reason: 'Nom similaire (champs legacy)' })
    }
  }

  const order = { high: 0, medium: 1, low: 2 }
  matches.sort((a, b) => order[a.confidence] - order[b.confidence])
  return matches
}

// ── Confidence badge ──────────────────────────────────────────────────────

const CONF_STYLE = {
  high: 'border-green/25 bg-green/10 text-green/80',
  medium: 'border-amber/25 bg-amber/10 text-amber/80',
  low: 'border-white/12 bg-white/4 text-white/50',
} as const

const CONF_LABEL = { high: 'fort', medium: 'moyen', low: 'faible' } as const

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  return (
    <span
      className={[
        'rounded-full border px-1.5 py-px text-[0.55rem] font-semibold uppercase tracking-[0.12em]',
        CONF_STYLE[level],
      ].join(' ')}
    >
      {CONF_LABEL[level]}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────

export function AuthorOrphanReconcileModal({
  open,
  orphanedAuthors,
  books,
  authorsMap,
  onLinkAuthorToBook,
  onClose,
}: Props) {
  const [selections, setSelections] = useState<Map<AuthorId, Set<BookId>>>(new Map())
  const [confirm, setConfirm] = useState(false)

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
    setConfirm(false)
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
    setConfirm(false)
  }

  const handleApply = () => {
    if (totalSelected === 0) return
    if (!confirm) {
      setConfirm(true)
      return
    }
    for (const [authorId, bookIds] of selections) {
      for (const bookId of bookIds) {
        const book = books.find((b) => b.id === bookId)
        if (book) onLinkAuthorToBook(authorId, book)
      }
    }
    setSelections(new Map())
    setConfirm(false)
    onClose()
  }

  const handleClose = () => {
    setSelections(new Map())
    setConfirm(false)
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
          <ConfirmButton
            confirmed={confirm}
            onClick={handleApply}
            disabled={totalSelected === 0}
            label={`Relier (${totalSelected})`}
            confirmLabel={`Confirmer (${totalSelected})`}
            tone="merge"
            icon={<Link2 size={13} />}
          />
        </>
      }
    >
      <div className="mb-4 max-h-[min(55vh,480px)] overflow-y-auto rounded-xl border border-white/8 bg-white/1.5 text-[0.8rem] backdrop-blur-sm">
        {withMatches.map((entry) => {
          const selectedSet = selections.get(entry.author.id)
          return (
            <div key={entry.author.id} className="border-b border-white/5 px-3 py-2.5 last:border-0">
              {/* Author header */}
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono font-semibold text-white/80">
                  {authorName(entry.author)}
                </span>
                <span className="h-px flex-1 bg-white/8" />
                <span className="text-[0.65rem] uppercase tracking-[0.12em] text-white/30">
                  {entry.matches.length} candidat{entry.matches.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Candidate books */}
              <div className="flex flex-col gap-1">
                {entry.matches.map((match) => {
                  const isSelected = !!selectedSet?.has(match.book.id)
                  const existingAuthors = bookAuthorDisplay(match.book, authorsMap)
                  const hasExistingAuthors = (match.book.authorIds || []).length > 0

                  return (
                    <button
                      key={match.book.id}
                      type="button"
                      onClick={() => toggleSelection(entry.author.id, match.book.id)}
                      className={[
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-1.5 text-left font-mono transition-all',
                        isSelected
                          ? 'border-green/25 bg-green/[0.06]'
                          : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                          isSelected
                            ? 'border-green/50 bg-green/20 text-green'
                            : 'border-white/15 text-transparent hover:border-white/35',
                        ].join(' ')}
                      >
                        <Check size={9} strokeWidth={3} />
                      </span>

                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <div className="flex items-baseline gap-2">
                          <span className={isSelected ? 'text-white/90' : 'text-white/60'}>
                            {match.book.title || '(sans titre)'}
                          </span>
                          {match.book.year && (
                            <span className="text-[0.7rem] text-white/25">{match.book.year}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.68rem] text-white/30">{match.reason}</span>
                          {hasExistingAuthors && (
                            <span className="text-[0.68rem] text-amber/50">
                              (déjà lié à {existingAuthors})
                            </span>
                          )}
                        </div>
                      </div>

                      <ConfidenceBadge level={match.confidence} />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Orphans without any match */}
        {withoutMatches.length > 0 && (
          <div className="border-t border-white/5 px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.12em] text-white/30">
              <AlertTriangle size={11} className="text-white/25" />
              <span>Sans correspondance ({withoutMatches.length})</span>
              <span className="h-px flex-1 bg-white/8" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {withoutMatches.map((e) => (
                <span
                  key={e.author.id}
                  className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1 font-mono text-[0.75rem] text-white/35"
                >
                  {authorName(e.author)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
