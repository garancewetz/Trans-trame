import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'

type ButtonVariant =
  | 'unstyled'
  /** Surface sombre type secondaire (souvent flex-1 en modale) */
  | 'surface'
  /** @deprecated utiliser `icon` */
  | 'buttonIcon'
  /** Icône seule */
  | 'icon'
  /** Bordure + fond : plat (`outlineWeight`) ou verre dépoli (`frosted` + `size` + `tone`) */
  | 'outline'
  /** Fond transparent, survol léger (`layout`) */
  | 'ghost'
  /** Pastille dans un groupe */
  | 'chip'

type ButtonTone =
  | 'neutral'
  | 'cyan'
  | 'amber'
  | 'sky'
  | 'mint'
  | 'magic'
  | 'warning'
  | 'orphan'
  | 'danger'
  | 'merge'
  | 'violet'
  | 'muted'

/** Avec `outline` + `frosted` : compact type barre vs taille standard */
type OutlineSize = 'sm' | 'md'

/** Avec `variant="ghost"` */
type GhostLayout = 'inline' | 'row' | 'banner'

/** Avec `variant="icon"` : `tight` = coin lg p-1 ; `soft` = zone un peu plus grande, survol léger */
type IconDensity = 'tight' | 'soft'

/** Avec `outline` sans `frosted` */
type OutlineWeight = 'muted' | 'accent' | 'faint' | 'strong'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  variant?: ButtonVariant
  tone?: ButtonTone
  active?: boolean
  selected?: boolean
  emphasis?: boolean
  icon?: ReactNode
  className?: string
  style?: CSSProperties
  /** `outline` + `frosted` — défaut `md` ; ignoré si plat */
  size?: OutlineSize
  /** `ghost` — défaut `inline` */
  layout?: GhostLayout
  /** `icon` — défaut `tight` */
  iconDensity?: IconDensity
  /** `outline` plat — défaut `muted` ; ignoré si `frosted` */
  outlineWeight?: OutlineWeight
  /** `outline` : verre dépoli + flou (ex. navbar) au lieu du plat toolbar */
  frosted?: boolean
}

const GLASS_TONE: Record<
  'cyan' | 'amber' | 'sky',
  { hover: string; active: string }
> = {
  cyan: {
    hover: 'hover:border-cyan/50 hover:bg-cyan/20 hover:text-white',
    active: 'border-cyan/60 bg-cyan/25 text-white',
  },
  amber: {
    hover: 'hover:border-peach/50 hover:bg-peach/20 hover:text-white',
    active: 'border-peach/60 bg-peach/35 text-white',
  },
  sky: {
    hover: 'hover:border-cyan/50 hover:bg-cyan/20 hover:text-white',
    active: 'border-cyan/50 bg-cyan/20 text-white',
  },
}

const GLASS_MD =
  'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-[16px] py-[6px] text-ui font-semibold text-white/70 backdrop-blur-lg transition-all'

const GLASS_SM =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-[10px] py-[5px] text-label font-semibold backdrop-blur-lg transition-all'

function resolveVariant(v: ButtonVariant): Exclude<ButtonVariant, 'buttonIcon'> {
  return v === 'buttonIcon' ? 'icon' : v
}

export function Button({
  variant = 'unstyled',
  tone,
  active = false,
  selected = false,
  emphasis = false,
  icon,
  className,
  style,
  type = 'button',
  size = 'md',
  layout = 'inline',
  iconDensity = 'tight',
  outlineWeight = 'muted',
  frosted = false,
  children,
  ...props
}: Props) {
  const v = resolveVariant(variant)
  const t = tone

  let classes = ''

  if (v === 'unstyled') {
    classes = ''
  } else if (v === 'surface') {
    classes =
      'flex-1 cursor-pointer rounded-lg border border-border-default bg-white/4 px-4 py-2 text-ui font-semibold text-text-soft transition-all hover:text-white'
  } else if (v === 'icon') {
    classes = clsx(
      iconDensity === 'soft'
        ? 'shrink-0 cursor-pointer rounded-md p-1.5 text-text-soft transition-colors hover:bg-white/12 hover:text-white'
        : 'inline-flex cursor-pointer items-center justify-center rounded-lg p-1 text-text-muted transition-colors hover:text-white'
    )
  } else if (v === 'outline' && frosted) {
    classes = size === 'sm' ? GLASS_SM : GLASS_MD
    if (size === 'sm') {
      if (t === 'mint' && active) {
        classes = clsx(
          classes,
          'border-green/50 bg-green/12 text-green'
        )
      } else if (t === 'mint' || !t || t === 'neutral') {
        classes = clsx(
          classes,
          'border-border-default bg-white/5 text-text-soft hover:border-white/20 hover:text-white/80'
        )
      }
    }
    if (size === 'md' && (t === 'cyan' || t === 'amber' || t === 'sky')) {
      const spec = GLASS_TONE[t]
      classes = clsx(classes, spec.hover, active && spec.active)
    }
  } else if (v === 'outline') {
    const shell =
      outlineWeight === 'strong'
        ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-ui font-semibold transition-all'
        : 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.8rem] font-semibold transition-all'
    classes = shell

    if (outlineWeight === 'muted') {
      classes = clsx(
        classes,
        'border-border-default bg-white/4 text-text-soft hover:border-white/20 hover:text-white'
      )
    }
    if (outlineWeight === 'accent' && t === 'magic') {
      classes = clsx(
        classes,
        'border-cyan/22 bg-cyan/5 text-cyan/60 hover:border-cyan/38 hover:bg-cyan/10 hover:text-cyan/90'
      )
    }
    if (outlineWeight === 'faint' && t === 'warning') {
      classes = clsx(
        classes,
        emphasis
          ? 'border-amber/[0.28] text-amber/65 hover:bg-amber/8 hover:text-amber/90'
          : 'cursor-default border-border-subtle text-white/18'
      )
    }
    if (outlineWeight === 'faint' && t === 'orphan') {
      classes = clsx(
        classes,
        emphasis
          ? 'border-border-default text-white/40 hover:border-amber/[0.28] hover:text-amber/75'
          : 'cursor-default border-border-subtle text-white/18'
      )
    }
    if (outlineWeight === 'strong' && t === 'merge') {
      classes = clsx(
        classes,
        active
          ? 'border-orange/60 bg-orange/15 text-amber/95 hover:bg-orange/25'
          : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
      )
    }
    if (outlineWeight === 'strong' && t === 'danger') {
      classes = clsx(
        classes,
        active
          ? 'border-red/60 bg-red/15 text-red/95 hover:bg-red/25'
          : 'border-border-default bg-transparent text-text-muted hover:border-red/30 hover:text-red/70'
      )
    }
  } else if (v === 'ghost') {
    if (layout === 'inline') {
      classes = clsx(
        'inline-flex cursor-pointer items-center justify-center bg-transparent transition-colors',
        t === 'muted' ? 'text-white/22 hover:text-white' : 'px-1.5 py-0.5 text-text-muted hover:text-white'
      )
    } else if (layout === 'row') {
      classes = clsx(
        'flex w-full cursor-pointer items-center rounded-lg bg-transparent text-left transition-colors',
        t === 'violet'
          ? 'gap-2.5 px-3 py-2.5 text-white hover:bg-violet/12'
          : 'gap-2.5 px-3.5 py-2.5 text-white hover:bg-white/10'
      )
    } else {
      classes =
        'flex w-full cursor-pointer items-center justify-center rounded-lg bg-transparent px-3 py-3 text-center text-body font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white'
    }
  } else if (v === 'chip') {
    classes = clsx(
      'cursor-pointer rounded-md px-3 py-1 text-label font-semibold transition-all',
      selected ? 'bg-white/10 text-white shadow-sm' : 'text-text-secondary hover:text-white/70'
    )
  }

  const gapForIcon = v === 'outline' && frosted && size === 'md' ? 'gap-2' : 'gap-1.5'
  const content =
    icon != null ? (
      <span className={clsx('inline-flex items-center', gapForIcon)}>
        {icon}
        {children}
      </span>
    ) : (
      children
    )

  // A11y: keyboard focus ring for every non-unstyled variant.
  const focusRing =
    v === 'unstyled'
      ? ''
      : 'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70 focus-visible:ring-offset-0'

  return (
    <button type={type} className={clsx(classes, focusRing, className)} style={style} {...props}>
      {content}
    </button>
  )
}
