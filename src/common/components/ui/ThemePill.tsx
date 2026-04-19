import clsx from 'clsx'

type Size = 'sm' | 'md'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-1.5 py-px text-[0.65rem]',
  md: 'px-2 py-0.5 text-[0.72rem]',
}

export function ThemePill({
  theme,
  size = 'md',
  className,
}: {
  theme: string
  size?: Size
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border border-dashed border-cyan/35 bg-cyan/8 font-medium lowercase tracking-wide text-cyan/85',
        SIZE_CLASSES[size],
        className,
      )}
      title={`Sous-catégorie proposée par l'IA : ${theme}`}
    >
      <span aria-hidden className="text-[0.55em] font-semibold uppercase tracking-[0.12em] text-cyan/60">
        IA
      </span>
      <span>{theme}</span>
    </span>
  )
}
