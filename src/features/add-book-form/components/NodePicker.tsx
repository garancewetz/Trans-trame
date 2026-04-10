import { useState } from 'react'
import type { Author, Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { FormField } from '@/common/components/ui/FormField'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'
import { SearchResultsDropdown } from '@/common/components/ui/SearchResultsDropdown'
import { InlineBookForm } from './InlineBookForm'

type Props = {
  label: string
  value: string
  onChange: (e: { target: { value: string } }) => void
  placeholder: string
  results: Book[]
  onPick: (node: Book) => void
  addButtonVisible?: boolean
  onRequestAddBook?: () => void
  query: string
  authorsMap: Map<string, AuthorNode>
  nodes?: Book[]
  authors?: Author[]
  onAddAuthor?: (author: Author) => void
  onInlineAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title' | 'type'>) => void
}

export function NodePicker({
  label,
  value,
  onChange,
  placeholder,
  results,
  onPick,
  addButtonVisible,
  onRequestAddBook,
  query,
  authorsMap,
  nodes,
  authors,
  onAddAuthor,
  onInlineAddBook,
}: Props) {
  const [inlineOpen, setInlineOpen] = useState(false)

  const mapped = results.map((n) => ({
    ...n,
    meta: `${bookAuthorDisplay(n, authorsMap)}, ${n.year}`,
  }))

  const handleInlineSubmit = (book: Partial<Book> & Pick<Book, 'id' | 'title' | 'type'>) => {
    onInlineAddBook?.(book)
    setInlineOpen(false)
  }

  const canInline = onInlineAddBook && nodes && authors

  return (
    <FormField label={label}>
      <SearchInputWithClear
        value={value}
        onChange={onChange}
        onClear={() => onChange({ target: { value: '' } })}
        placeholder={placeholder}
        focusTone="cyan"
      />

      {!inlineOpen && query.trim() && (
        <SearchResultsDropdown
          results={mapped}
          onPick={onPick}
          emptyLabel={`Aucun ouvrage trouvé pour \u00ab\u00a0${query}\u00a0\u00bb`}
          emptyAction={
            addButtonVisible ? (
              <Button
                variant="ghost"
                layout="banner"
                onClick={() => {
                  if (canInline) {
                    setInlineOpen(true)
                  } else if (typeof onRequestAddBook === 'function') {
                    onRequestAddBook()
                  }
                }}
                type="button"
              >
                Ajouter un ouvrage ?
              </Button>
            ) : undefined
          }
        />
      )}

      {inlineOpen && canInline && (
        <InlineBookForm
          initialTitle={query.trim()}
          nodes={nodes}
          authors={authors}
          authorsMap={authorsMap}
          onAddAuthor={onAddAuthor}
          onSubmit={handleInlineSubmit}
          onCancel={() => setInlineOpen(false)}
        />
      )}
    </FormField>
  )
}
