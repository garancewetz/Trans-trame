import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ArrowDown, ArrowLeft } from 'lucide-react'
import { Controller } from 'react-hook-form'
import type { Author, Book, BookId } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { Textarea } from '@/common/components/ui/Textarea'
import { FormField } from '@/common/components/ui/FormField'
import { SelectedItemsPills } from '@/common/components/ui/SelectedItemsPills'
import { NodePicker } from './NodePicker'
import { EditionPicker } from './EditionPicker'

type LinkFormValues = {
  citationText: string
  edition: string
  page: string
  context: string
}

type Props = {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onRequestBack?: (() => void) | null
  linkForm: UseFormReturn<LinkFormValues>
  sourceId: string
  setSourceId: (id: string) => void
  targetIds: BookId[]
  setTargetIds: Dispatch<SetStateAction<BookId[]>>
  selectedSource: Book | null
  selectedTargets: Book[]
  sourceSearch: string
  setSourceSearch: (q: string) => void
  targetSearch: string
  setTargetSearch: (q: string) => void
  sourceResults: Book[]
  targetResults: Book[]
  onRequestAddBook?: () => void
  inputClass: string
  authorsMap: Map<string, AuthorNode>
  nodes: Book[]
  authors: Author[]
  onAddAuthor?: (author: Author) => void
  onInlineAddBook?: (book: Partial<Book> & Pick<Book, 'id' | 'title' | 'type'>) => void
  knownEditions?: string[]
}

export function LinkForm({
  onSubmit,
  onRequestBack,
  linkForm,
  sourceId,
  setSourceId,
  targetIds,
  setTargetIds,
  selectedSource,
  selectedTargets,
  sourceSearch,
  setSourceSearch,
  targetSearch,
  setTargetSearch,
  sourceResults,
  targetResults,
  onRequestAddBook,
  inputClass,
  authorsMap,
  nodes,
  authors,
  onAddAuthor,
  onInlineAddBook,
  knownEditions = [],
}: Props) {
  const { register, control } = linkForm
  const removeTarget = (id: string) => setTargetIds((prev) => prev.filter((t) => t !== id))

  const linkCount = targetIds.length

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      {typeof onRequestBack === 'function' && (
        <Button
          type="button"
          onClick={() => onRequestBack()}
          className="inline-flex items-center gap-1.5 cursor-pointer bg-transparent text-left text-[0.88rem] font-semibold text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} /> Retour
        </Button>
      )}
      <h3 className="border-b border-white/10 pb-2.5 text-[0.92rem] font-bold uppercase tracking-[2px] text-white/50">
        Nouveau lien
      </h3>
      <p className="-mt-2 text-[0.92rem] leading-relaxed text-white/35">
        Le livre <strong className="text-white/60">source</strong> cite le(s) livre(s){' '}
        <strong className="text-white/60">cible(s)</strong>.
      </p>

      <NodePicker
        label="Ce livre cite..."
        value={sourceSearch || (selectedSource ? `${selectedSource.title} — ${bookAuthorDisplay(selectedSource, authorsMap)}` : '')}
        query={sourceSearch}
        onChange={(e) => {
          if (sourceId) setSourceId('')
          setSourceSearch(e.target.value)
        }}
        placeholder={sourceId ? 'Changer le livre source…' : 'Rechercher le livre source…'}
        results={sourceResults}
        onPick={(n) => {
          setSourceId(n.id)
          setSourceSearch('')
        }}
        addButtonVisible
        onRequestAddBook={onRequestAddBook}
        authorsMap={authorsMap}
        nodes={nodes}
        authors={authors}
        onAddAuthor={onAddAuthor}
        onInlineAddBook={(book) => {
          onInlineAddBook?.(book)
          setSourceId(book.id)
          setSourceSearch('')
        }}
      />

      <div className="-my-2 flex justify-center text-cyan/50">
        <ArrowDown size={20} />
      </div>

      {/* Multi-select target section */}
      <div className="flex flex-col gap-2">
        <span className="text-[0.75rem] font-semibold uppercase tracking-[1px] text-white/35">
          ...{linkCount > 1 ? `ces ${linkCount} livres` : 'ce livre'}
        </span>

        {/* Selected target pills */}
        <SelectedItemsPills items={selectedTargets} onRemove={removeTarget} />

        {/* Target search input */}
        <NodePicker
          label=""
          value={targetSearch}
          query={targetSearch}
          onChange={(e) => setTargetSearch(e.target.value)}
          placeholder={
            selectedTargets.length > 0
              ? 'Ajouter un autre livre cible…'
              : 'Rechercher le livre cible…'
          }
          results={targetResults}
          onPick={(n) => {
            setTargetIds((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]))
            setTargetSearch('')
          }}
          addButtonVisible
          onRequestAddBook={onRequestAddBook}
          authorsMap={authorsMap}
          nodes={nodes}
          authors={authors}
          onAddAuthor={onAddAuthor}
          onInlineAddBook={(book) => {
            onInlineAddBook?.(book)
            setTargetIds((prev) => (prev.includes(book.id) ? prev : [...prev, book.id]))
            setTargetSearch('')
          }}
        />
      </div>

      {/* Shared citation fields */}
      {linkCount > 1 && (
        <p className="-mt-1 text-[0.82rem] text-white/30">
          Ces champs s&apos;appliquent à tous les liens créés.
        </p>
      )}

      <FormField label="Extrait / Lien">
        <Textarea
          className={`${inputClass} resize-none leading-relaxed`}
          rows={3}
          placeholder="&laquo; L'extrait qui justifie le lien... &raquo;"
          {...register('citationText')}
        />
      </FormField>

      <FormField label="Édition citée">
        <Controller
          name="edition"
          control={control}
          render={({ field }) => (
            <EditionPicker
              value={field.value}
              onChange={field.onChange}
              knownEditions={knownEditions}
              className={inputClass}
              placeholder="Ex : Gallimard, coll. Folio, 1976"
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Page / Volume">
          <TextInput variant="default" className={inputClass} placeholder="p. 42, vol. 3…" {...register('page')} />
        </FormField>
        <FormField label="Contexte">
          <TextInput
            variant="default"
            className={inputClass}
            placeholder="Chapitre 3..."
            {...register('context')}
          />
        </FormField>
      </div>

      <Button
        type="submit"
        disabled={!sourceId || linkCount === 0}
        className="mt-1 w-full cursor-pointer rounded-[10px] bg-linear-to-br from-cyan/70 to-blue/90 px-5 py-3.5 text-[0.95rem] font-semibold text-white shadow-[0_4px_20px_rgba(140,220,255,0.15)] transition-all hover:-translate-y-px hover:from-cyan/90 hover:to-blue/100 hover:shadow-[0_4px_24px_rgba(140,220,255,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {linkCount > 1 ? `Créer les ${linkCount} liens` : 'Créer un lien'}
      </Button>
    </form>
  )
}
