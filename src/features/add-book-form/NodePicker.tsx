import { Search, X } from 'lucide-react'
import { axesGradient } from '@/lib/categories'
import { bookAuthorDisplay } from '@/lib/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { FormField } from '@/common/components/ui/FormField'

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
  return (
    <FormField label={label}>
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 text-white/25">
          <Search size={16} />
        </div>
        <TextInput
          variant="picker"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        {query && (
          <Button
            variant="ghost"
            layout="inline"
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            onClick={() => onChange({ target: { value: '' } })}
            type="button"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {query.trim() && (
        <div className="max-h-[200px] overflow-y-auto rounded-[10px] border border-white/10 bg-white/5 p-1">
          {results.length === 0 ? (
            <div className="p-2">
              <p className="p-2 text-center text-[0.82rem] leading-relaxed text-white/40">
                Aucun ouvrage trouv&eacute; pour &laquo;&nbsp;{query}&nbsp;&raquo;
              </p>
              {addButtonVisible && typeof onRequestAddBook === 'function' && (
                <Button
                  variant="ghost"
                  layout="banner"
                  onClick={() => {
                    onRequestAddBook()
                  }}
                  type="button"
                >
                  Ajouter un ouvrage ?
                </Button>
              )}
            </div>
          ) : (
            <ul className="flex list-none flex-col">
              {results.map((n) => (
                <li key={n.id}>
                  <Button
                    variant="ghost"
                    layout="row"
                    tone="neutral"
                    type="button"
                    onClick={() => onPick(n)}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: axesGradient(n.axes) }}
                    />
                    <span className="min-w-0">
                      <strong className="block text-[0.85rem] font-semibold text-white">{n.title}</strong>
                      <span className="mt-0.5 block text-[0.75rem] text-white/35">
                        {bookAuthorDisplay(n, authorsMap)}, {n.year}
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </FormField>
  )
}
