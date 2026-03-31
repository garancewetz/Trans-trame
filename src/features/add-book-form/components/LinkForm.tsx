import { ArrowDown, ArrowLeft, X } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { Textarea } from '@/common/components/ui/Textarea'
import { FormField } from '@/common/components/ui/FormField'
import { NodePicker } from './NodePicker'

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
}) {
  const { register } = linkForm
  const removeTarget = (id) => setTargetIds((prev) => prev.filter((t) => t !== id))

  const linkCount = targetIds.length

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      {typeof onRequestBack === 'function' && (
        <Button
          type="button"
          onClick={() => onRequestBack()}
          className="inline-flex items-center gap-1.5 cursor-pointer bg-transparent text-left text-[0.78rem] font-semibold text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} /> Retour
        </Button>
      )}
      <h3 className="border-b border-white/10 pb-2.5 text-[0.82rem] font-bold uppercase tracking-[2px] text-white/50">
        Nouveau lien
      </h3>
      <p className="-mt-2 text-[0.82rem] leading-relaxed text-white/35">
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
      />

      <div className="-my-2 flex justify-center text-[rgba(140,220,255,0.5)]">
        <ArrowDown size={20} />
      </div>

      {/* Multi-select target section */}
      <div className="flex flex-col gap-2">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          ...{linkCount > 1 ? `ces ${linkCount} livres` : 'ce livre'}
        </span>

        {/* Selected target pills */}
        {selectedTargets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTargets.map((t) => (
              <span
                key={t.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/8 pl-2 pr-1.5 py-1 text-[0.75rem] text-white/75"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: axesGradient(t.axes) }}
                />
                <span className="max-w-[160px] truncate">{t.title}</span>
                <Button
                  type="button"
                  onClick={() => removeTarget(t.id)}
                  className="ml-0.5 shrink-0 cursor-pointer rounded-full bg-transparent p-0.5 text-white/35 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label={`Retirer ${t.title}`}
                >
                  <X size={11} />
                </Button>
              </span>
            ))}
          </div>
        )}

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
        />
      </div>

      {/* Shared citation fields */}
      {linkCount > 1 && (
        <p className="-mt-1 text-[0.73rem] text-white/30">
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
        <TextInput
          variant="default"
          className={inputClass}
          placeholder="Ex : Gallimard, coll. Folio, 1976"
          {...register('edition')}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Page">
          <TextInput variant="default" className={inputClass} placeholder="p. 42" {...register('page')} />
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
        className="mt-1 w-full cursor-pointer rounded-[10px] bg-linear-to-br from-[rgba(140,220,255,0.7)] to-[rgba(80,160,255,0.9)] px-5 py-3.5 text-[0.85rem] font-semibold text-white shadow-[0_4px_20px_rgba(140,220,255,0.15)] transition-all hover:-translate-y-px hover:from-[rgba(140,220,255,0.9)] hover:to-[rgba(80,160,255,1)] hover:shadow-[0_4px_24px_rgba(140,220,255,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {linkCount > 1 ? `Créer les ${linkCount} liens` : 'Créer un lien'}
      </Button>
    </form>
  )
}
