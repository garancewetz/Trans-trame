import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { FormField } from '@/common/components/ui/FormField'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'
import { SearchResultsDropdown } from '@/common/components/ui/SearchResultsDropdown'

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
}) {
  const mapped = results.map((n) => ({
    ...n,
    meta: `${bookAuthorDisplay(n, authorsMap)}, ${n.year}`,
  }))

  return (
    <FormField label={label}>
      <SearchInputWithClear
        value={value}
        onChange={onChange}
        onClear={() => onChange({ target: { value: '' } })}
        placeholder={placeholder}
        focusTone="cyan"
      />

      {query.trim() && (
        <SearchResultsDropdown
          results={mapped}
          onPick={onPick}
          emptyLabel={`Aucun ouvrage trouvé pour \u00ab\u00a0${query}\u00a0\u00bb`}
          emptyAction={
            addButtonVisible && typeof onRequestAddBook === 'function' ? (
              <Button
                variant="ghost"
                layout="banner"
                onClick={() => onRequestAddBook()}
                type="button"
              >
                Ajouter un ouvrage ?
              </Button>
            ) : undefined
          }
        />
      )}
    </FormField>
  )
}
