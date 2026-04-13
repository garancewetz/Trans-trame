import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

/**
 * Visual preset.
 * - `pill`    : rounded full, subtle surface, default leading green status dot, truncating label.
 * - `inline`  : rounded full, bold uppercase, designed to host an icon + label; colour via `className`.
 * - `axis`    : solid coloured background (passed via `color`), black text, used for taxonomy chips.
 * - `count`   : bare numeric pill, styled entirely by caller (legacy CountBadge behaviour).
 * - `outline` : bordered pill with translucent surface, for clickable secondary chips (e.g. author links).
 */
export type BadgeVariant = 'pill' | 'inline' | 'axis' | 'count' | 'outline'

type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'prefix'> & {
  variant?: BadgeVariant
  /** Axis variant : background colour. */
  color?: string
  /** Element rendered before `children`. For `pill`, defaults to a green status dot unless `prefix={null}`. */
  prefix?: ReactNode
  /** Element rendered after `children`. */
  suffix?: ReactNode
  /** Shorthand for `count` variant : renders `count ?? 0` as content. */
  count?: number | null
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

const PILL_BASE =
  'inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-label text-white/55'

const INLINE_BASE =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-[3px] text-label font-bold uppercase tracking-[0.5px]'

const AXIS_BASE =
  'inline-block rounded-full px-3 py-[3px] text-caption font-bold uppercase tracking-[0.5px] text-black'

const COUNT_BASE =
  'inline-flex items-center justify-center rounded-full tabular-nums'

const OUTLINE_BASE =
  'inline-flex items-center rounded-full border border-white/14 bg-white/6 px-1.5 py-px text-micro text-white/65'

const VARIANT_BASE: Record<BadgeVariant, string> = {
  pill: PILL_BASE,
  inline: INLINE_BASE,
  axis: AXIS_BASE,
  count: COUNT_BASE,
  outline: OUTLINE_BASE,
}

const DEFAULT_PILL_DOT = (
  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-green opacity-70" />
)

export function Badge({
  variant = 'pill',
  color,
  prefix,
  suffix,
  count,
  className,
  style,
  children,
  title,
  ...rest
}: BadgeProps) {
  const base = VARIANT_BASE[variant]

  const resolvedStyle: CSSProperties | undefined =
    variant === 'axis' && color ? { backgroundColor: color, ...style } : style

  // `count` shortcut : used when caller passes `count` with `variant="count"` (legacy CountBadge API).
  const body = variant === 'count' && count !== undefined ? (count ?? 0) : children

  const resolvedPrefix = variant === 'pill' && prefix === undefined ? DEFAULT_PILL_DOT : prefix

  // Pill truncates its main label to keep max-width intact.
  const labelNode =
    variant === 'pill' ? (
      <span className="truncate">{body}</span>
    ) : (
      body
    )

  return (
    <span className={clsx(base, className)} style={resolvedStyle} title={title} {...rest}>
      {resolvedPrefix}
      {labelNode}
      {suffix != null && (
        <span
          className={clsx(
            'shrink-0',
            variant === 'pill' && 'tabular-nums text-white/30',
          )}
        >
          {suffix}
        </span>
      )}
    </span>
  )
}
