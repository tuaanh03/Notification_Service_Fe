import { useTranslations } from 'next-intl'
import { tOr } from '@/i18n/dynamic'

/** Nguồn của một thao tác trong audit (`admin_api`, `v1_api`…) — dịch theo nhóm `auditSources`, lạ thì hiện nguyên. */
export function SourceBadge({ source }: { source: string }) {
  const t = useTranslations('auditSources')
  return (
    <span className="rounded border border-[var(--orbit)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
      {tOr(t, source)}
    </span>
  )
}
