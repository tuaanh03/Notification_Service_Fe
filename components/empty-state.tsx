/** Empty state với minh hoạ orbit SVG mảnh (01 §2) — không emoji, icon lucide ở tâm. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="relative flex size-20 items-center justify-center text-[var(--starlight)]">
        <svg viewBox="0 0 80 80" className="absolute inset-0 size-full" aria-hidden>
          <ellipse cx="40" cy="40" rx="36" ry="14" fill="none" stroke="var(--starlight)" strokeOpacity=".3" strokeWidth="1" />
          <ellipse
            cx="40"
            cy="40"
            rx="36"
            ry="14"
            fill="none"
            stroke="var(--pulsar)"
            strokeOpacity=".35"
            strokeWidth="1"
            strokeDasharray="3 5"
            transform="rotate(60 40 40)"
          />
          <circle cx="76" cy="40" r="1.5" fill="var(--starlight)" />
          <circle cx="22" cy="9" r="1.5" fill="var(--pulsar)" />
        </svg>
        <Icon className="relative size-6" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="max-w-sm text-xs leading-5 text-[var(--text-secondary)]">{description}</p>
      {action}
    </div>
  )
}
