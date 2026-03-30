import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'

export type ButtonVariant =
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

export type ButtonTone =
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
export type OutlineSize = 'sm' | 'md'

/** Avec `variant="ghost"` */
export type GhostLayout = 'inline' | 'row' | 'banner'

/** Avec `variant="icon"` : `tight` = coin lg p-1 ; `soft` = zone un peu plus grande, survol léger */
export type IconDensity = 'tight' | 'soft'

/** Avec `outline` sans `frosted` */
export type OutlineWeight = 'muted' | 'accent' | 'faint' | 'strong'

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
    hover: 'hover:border-[rgba(130,200,255,0.5)] hover:bg-[rgba(130,200,255,0.2)] hover:text-white',
    active: 'border-[rgba(130,200,255,0.6)] bg-[rgba(130,200,255,0.25)] text-white',
  },
  amber: {
    hover: 'hover:border-[rgba(255,180,130,0.5)] hover:bg-[rgba(255,180,130,0.2)] hover:text-white',
    active: 'border-[rgba(255,180,130,0.6)] bg-[rgba(255,180,130,0.35)] text-white',
  },
  sky: {
    hover: 'hover:border-[rgba(90,200,255,0.5)] hover:bg-[rgba(90,200,255,0.2)] hover:text-white',
    active: 'border-[rgba(90,200,255,0.5)] bg-[rgba(90,200,255,0.2)] text-white',
  },
}

const GLASS_MD =
  'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-[16px] py-[6px] text-[0.76rem] font-semibold text-white/70 backdrop-blur-lg transition-all'

const GLASS_SM =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-[10px] py-[5px] text-[0.72rem] font-semibold backdrop-blur-lg transition-all'

function resolveVariant(v: ButtonVariant): Exclude<ButtonVariant, 'buttonIcon'> {
  return v === 'buttonIcon' ? 'icon' : v
}

export default function Button({
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
      'flex-1 cursor-pointer rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-[0.75rem] font-semibold text-white/55 transition-all hover:text-white'
  } else if (v === 'icon') {
    classes = clsx(
      iconDensity === 'soft'
        ? 'shrink-0 cursor-pointer rounded-md p-1.5 text-white/55 transition-colors hover:bg-white/12 hover:text-white'
        : 'inline-flex cursor-pointer items-center justify-center rounded-lg p-1 text-white/30 transition-colors hover:text-white'
    )
  } else if (v === 'outline' && frosted) {
    classes = size === 'sm' ? GLASS_SM : GLASS_MD
    if (size === 'sm') {
      if (t === 'mint' && active) {
        classes = clsx(
          classes,
          'border-[rgba(0,255,135,0.5)] bg-[rgba(0,255,135,0.12)] text-[#00FF87]'
        )
      } else if (t === 'mint' || !t || t === 'neutral') {
        classes = clsx(
          classes,
          'border-white/10 bg-white/5 text-white/45 hover:border-white/20 hover:text-white/80'
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
        ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-[0.75rem] font-semibold transition-all'
        : 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold transition-all'
    classes = shell

    if (outlineWeight === 'muted') {
      classes = clsx(
        classes,
        'border-white/10 bg-white/4 text-white/50 hover:border-white/20 hover:text-white'
      )
    }
    if (outlineWeight === 'accent' && t === 'magic') {
      classes = clsx(
        classes,
        'border-[rgba(140,220,255,0.22)] bg-[rgba(140,220,255,0.05)] text-[rgba(140,220,255,0.6)] hover:border-[rgba(140,220,255,0.38)] hover:bg-[rgba(140,220,255,0.1)] hover:text-[rgba(140,220,255,0.9)]'
      )
    }
    if (outlineWeight === 'faint' && t === 'warning') {
      classes = clsx(
        classes,
        emphasis
          ? 'border-[rgba(255,180,60,0.28)] text-[rgba(255,200,100,0.65)] hover:bg-[rgba(255,180,60,0.08)] hover:text-[rgba(255,200,100,0.9)]'
          : 'cursor-default border-white/5 text-white/18'
      )
    }
    if (outlineWeight === 'faint' && t === 'orphan') {
      classes = clsx(
        classes,
        emphasis
          ? 'border-white/10 text-white/40 hover:border-[rgba(255,210,0,0.28)] hover:text-[rgba(255,210,100,0.75)]'
          : 'cursor-default border-white/5 text-white/18'
      )
    }
    if (outlineWeight === 'strong' && t === 'merge') {
      classes = clsx(
        classes,
        active
          ? 'border-[rgba(255,171,64,0.6)] bg-[rgba(255,171,64,0.15)] text-[rgba(255,200,100,0.95)] hover:bg-[rgba(255,171,64,0.25)]'
          : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
      )
    }
    if (outlineWeight === 'strong' && t === 'danger') {
      classes = clsx(
        classes,
        active
          ? 'border-[rgba(255,80,80,0.6)] bg-[rgba(255,80,80,0.15)] text-[rgba(255,140,140,0.95)] hover:bg-[rgba(255,80,80,0.25)]'
          : 'border-white/10 bg-transparent text-white/30 hover:border-[rgba(255,80,80,0.3)] hover:text-[rgba(255,140,140,0.7)]'
      )
    }
  } else if (v === 'ghost') {
    if (layout === 'inline') {
      classes = clsx(
        'inline-flex cursor-pointer items-center justify-center bg-transparent transition-colors',
        t === 'muted' ? 'text-white/22 hover:text-white' : 'px-1.5 py-0.5 text-white/30 hover:text-white'
      )
    } else if (layout === 'row') {
      classes = clsx(
        'flex w-full cursor-pointer items-center rounded-lg bg-transparent text-left transition-colors',
        t === 'violet'
          ? 'gap-2.5 px-3 py-2.5 text-white hover:bg-[rgba(168,130,255,0.12)]'
          : 'gap-2.5 px-3.5 py-2.5 text-white hover:bg-white/10'
      )
    } else {
      classes =
        'flex w-full cursor-pointer items-center justify-center rounded-lg bg-transparent px-3 py-3 text-center text-[0.84rem] font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white'
    }
  } else if (v === 'chip') {
    classes = clsx(
      'cursor-pointer rounded-md px-3 py-1 text-[0.72rem] font-semibold transition-all',
      selected ? 'bg-white/10 text-white shadow-sm' : 'text-white/38 hover:text-white/70'
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

  return (
    <button type={type} className={clsx(classes, className)} style={style} {...props}>
      {content}
    </button>
  )
}
