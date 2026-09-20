import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Breadcrumb = { label: string; href?: string }

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumb?: Breadcrumb[]
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb && (
          <div className="mb-2 flex items-center gap-1 text-xs text-[var(--text-muted)]">
            {breadcrumb.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[var(--text-secondary)]">
                    {crumb.label}
                  </Link>
                ) : (
                  crumb.label
                )}
                {i < breadcrumb.length - 1 && <ChevronRight className="size-3" />}
              </span>
            ))}
          </div>
        )}
        <h1 className="break-all text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  )
}
