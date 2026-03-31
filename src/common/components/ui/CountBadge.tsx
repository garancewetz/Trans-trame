type CountBadgeProps = {
  count?: number | null
  className?: string
}

export function CountBadge({ count, className }: CountBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full tabular-nums',
        className,
      ].filter(Boolean).join(' ')}
    >
      {count ?? 0}
    </span>
  )
}

