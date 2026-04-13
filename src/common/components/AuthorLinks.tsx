import { authorName } from '@/common/utils/authorUtils'
import { useFilter } from '@/core/FilterContext'
import type { AuthorNode, BookNode } from '@/common/utils/authorUtils'

type AuthorLinksProps = {
  book: Partial<BookNode>
  authors: Map<string, AuthorNode> | AuthorNode[]
  className?: string
}

/**
 * Affiche le ou les auteur·ices d'un livre sous forme de boutons cliquables
 * qui déclenchent le surlignage (highlight { kind: 'author' }) dans le graphe.
 * Fallback silencieux en texte pour les livres legacy sans authorIds.
 */
export function AuthorLinks({ book, authors, className }: AuthorLinksProps) {
  const { activeHighlight, toggleHighlight } = useFilter()
  const ids = book?.authorIds

  if (!ids || ids.length === 0) {
    const name = authorName(book)
    return <span className={className}>{name}</span>
  }

  const map = authors instanceof Map ? authors : null
  const list = authors instanceof Map ? [] : authors

  const entries = ids
    .map((id) => {
      const a = map ? map.get(id) : list.find((au) => au.id === id)
      const name = a ? authorName(a) : ''
      return name ? { id, name } : null
    })
    .filter((x): x is { id: string; name: string } => x !== null)

  if (entries.length === 0) return <span className={className}>—</span>

  return (
    <span className={className}>
      {entries.map((e, i) => {
        const isActive =
          activeHighlight?.kind === 'author' && activeHighlight.authorId === e.id
        return (
          <span key={e.id}>
            {i > 0 && <span className="text-white/28">, </span>}
            <button
              type="button"
              className={`cursor-pointer rounded underline-offset-2 transition-colors hover:text-amber hover:underline ${
                isActive ? 'text-amber underline' : ''
              }`}
              onClick={(ev) => {
                ev.stopPropagation()
                toggleHighlight({ kind: 'author', authorId: e.id })
              }}
              title={`Surligner tous les textes de ${e.name}`}
            >
              {e.name}
            </button>
          </span>
        )
      })}
    </span>
  )
}
