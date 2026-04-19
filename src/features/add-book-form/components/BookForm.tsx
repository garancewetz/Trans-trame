import type { FormEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { Author, Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import clsx from 'clsx'
import { Controller } from 'react-hook-form'
import { Pin } from 'lucide-react'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { Textarea } from '@/common/components/ui/Textarea'
import { FormField } from '@/common/components/ui/FormField'
import { Badge } from '@/common/components/ui/Badge'
import { AuthorPicker } from '../../table/components/AuthorPicker'
import { AxisSelector } from './AxisSelector'
import { DuplicateWarning } from './DuplicateWarning'
import { BookFormEditDangerZone } from './BookFormEditDangerZone'
import { RESOURCE_TYPES } from '@/common/constants/resourceTypes'

export type BookFormValues = {
  title: string
  authorIds: string[]
  /** Form field value (string while typing; normalized on submit). */
  year: string | number | null | undefined
  axes: string[]
  description?: string
  stickyAuthor?: boolean
  resourceType: string
}

export type BookRecentDraft = {
  title: string
  authorIds: string[]
  year: number | null
}

type Props = {
  mode: 'book' | 'edit'
  inputClass?: string
  onSubmit: (e: FormEvent) => void
  bookForm: UseFormReturn<BookFormValues>
  toggleAxis: (axisId: string) => void
  possibleDuplicates: Book[]
  editNode: Book | null | undefined
  nodes: Book[]
  onDeleteBook?: (id: string) => void
  onMergeBooks?: (fromId: string, toId: string) => void
  recentQueue: BookRecentDraft[]
  authorsMap: Map<string, AuthorNode>
  authors: Author[]
  onAddAuthor?: (author: Author) => void
}

export function BookForm({
  mode,
  inputClass,
  onSubmit,
  bookForm,
  toggleAxis,
  possibleDuplicates,
  editNode,
  nodes,
  onDeleteBook,
  onMergeBooks,
  recentQueue,
  authorsMap,
  authors,
  onAddAuthor,
}: Props) {
  const { register, control, watch } = bookForm
  const selectedAxes = watch('axes') || []

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      <h3 className="border-b border-white/10 pb-2.5 text-body font-bold uppercase tracking-[2px] text-white/50">
        {mode === 'edit' ? 'Modifier la ressource' : 'Nouvelle ressource'}
      </h3>

      <FormField label="Type de ressource" as="div">
        <Controller
          name="resourceType"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {RESOURCE_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.8rem] font-semibold transition-all',
                    field.value === value
                      ? 'border-cyan/50 bg-cyan/12 text-cyan/90'
                      : 'border-white/12 text-white/40 hover:border-white/25 hover:text-white/65',
                  )}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>
          )}
        />
      </FormField>

      <FormField label="Titre">
        <TextInput
          variant="default"
          className={inputClass}
          placeholder="Ex : Feminist Theory"
          {...register('title', { required: true })}
        />
      </FormField>

      <FormField label="Auteur·ices" as="div">
        <Controller
          name="authorIds"
          control={control}
          rules={{
            validate: (v) => (Array.isArray(v) && v.length > 0) || 'Ajoute au moins un·e auteur·ice',
          }}
          render={({ field, fieldState }) => (
            <>
              <AuthorPicker
                authors={authors || []}
                selectedAuthorIds={field.value || []}
                onChange={field.onChange}
                onAddAuthor={onAddAuthor}
              />
              {fieldState.error?.message && (
                <span className="text-caption text-red/85">{fieldState.error.message}</span>
              )}
            </>
          )}
        />
      </FormField>

      {mode === 'book' && (
        <Controller
          name="stickyAuthor"
          control={control}
          render={({ field: { value, onChange } }) => (
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <Button
                type="button"
                onClick={() => onChange(!value)}
                className={clsx(
                  'relative h-5 w-9 shrink-0 rounded-full border transition-all duration-200',
                  value
                    ? 'border-green/60 bg-green/25'
                    : 'border-white/15 bg-white/5',
                )}
                aria-checked={value}
                role="switch"
              >
                <span
                  className={clsx(
                    'absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-200',
                    value ? 'left-[18px] bg-green' : 'left-0.5 bg-white/30',
                  )}
                />
              </Button>
              <span className="inline-flex items-center gap-1.5 text-ui text-white/50 transition-colors">
                <Pin size={11} className={value ? 'text-green' : 'text-white/30'} />
                Garder les auteur·ices pour la suite
              </span>
            </label>
          )}
        />
      )}

      <DuplicateWarning possibleDuplicates={possibleDuplicates} authorsMap={authorsMap} />

      <FormField label="Année">
        <TextInput
          variant="default"
          className={inputClass}
          type="number"
          placeholder="1984"
          {...register('year')}
        />
      </FormField>

      <AxisSelector selectedAxes={selectedAxes} toggleAxis={toggleAxis} />

      <FormField label="Description">
        <Textarea
          className={`${inputClass} resize-none leading-relaxed`}
          rows={3}
          placeholder="Courte description de la ressource..."
          {...register('description')}
        />
      </FormField>

      <Button
        type="submit"
        className="mt-1 w-full cursor-pointer rounded-[10px] bg-linear-to-br from-cyan/70 to-blue/90 px-5 py-3.5 text-[0.95rem] font-semibold text-white shadow-[0_4px_20px_rgba(140,220,255,0.15)] transition-all hover:-translate-y-px hover:from-cyan/90 hover:to-blue/100 hover:shadow-[0_4px_24px_rgba(140,220,255,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mode === 'edit' ? 'Enregistrer les modifications' : 'Ajouter la ressource'}
      </Button>

      {mode === 'book' && recentQueue && recentQueue.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold uppercase tracking-[1.5px] text-white/25">
            Ajouté·es cette session
          </span>
          <div className="flex flex-wrap gap-1.5">
            {recentQueue.map((item, i) => (
              <Badge
                key={i}
                variant="pill"
                title={`${item.title} — ${bookAuthorDisplay({ authorIds: item.authorIds }, authorsMap)}, ${item.year}`}
                suffix={item.year || null}
              >
                {item.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {mode === 'edit' && editNode && (
        <BookFormEditDangerZone
          editNode={editNode}
          nodes={nodes}
          authorsMap={authorsMap}
          onMergeBooks={onMergeBooks}
          onDeleteBook={onDeleteBook}
        />
      )}
    </form>
  )
}
