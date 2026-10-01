import { ClipboardCheck } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { EmptyState } from '@/components/empty-state'
export default async function Page() {
  const t = await getTranslations('common')
  return (
    <EmptyState
      icon={ClipboardCheck}
      title={t('underConstruction')}
      description={t('underConstructionBody')}
      action={<span className="font-mono text-xs text-[var(--text-muted)]">/admin/approvals</span>}
    />
  )
}
