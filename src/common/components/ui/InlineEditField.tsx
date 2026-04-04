import { Button } from './Button'

type Props = {
  editing: boolean
  value: string
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  onStartEdit: () => void
  /** Display text when not editing */
  displayValue: string
  /** Placeholder for the input */
  placeholder?: string
  /** Label for the edit button */
  editLabel?: string
  /** Title tooltip for the edit button */
  editTitle?: string
}

export function InlineEditField({
  editing,
  value,
  onChange,
  onCommit,
  onCancel,
  onStartEdit,
  displayValue,
  placeholder,
  editLabel = 'Modifier',
  editTitle,
}: Props) {
  if (editing) {
    return (
      <input
        autoFocus
        className="w-full rounded-md border border-white/10 bg-white/4 px-2 py-1 font-mono text-[0.82rem] text-white outline-none focus:border-cyan/[0.28]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter') onCommit()
        }}
        placeholder={placeholder}
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      {displayValue}
      <Button
        type="button"
        className="shrink-0 cursor-pointer rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[0.72rem] font-semibold text-white/60 transition-all hover:border-white/20 hover:bg-white/8"
        onClick={onStartEdit}
        title={editTitle}
      >
        {editLabel}
      </Button>
    </span>
  )
}
