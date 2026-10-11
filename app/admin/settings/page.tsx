import { PlugZap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { SystemSettingsPanel } from '@/components/admin/system-settings-panel'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'
import { getSystemSettings } from '@/lib/api/system-settings'

/** Cài đặt hệ thống (ADR-0030 của backend) — đọc ở server bằng phiên của Super Admin. */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    return <SystemSettingsPanel initial={await getSystemSettings()} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    const t = await getTranslations('systemSettings')
    return (
      <>
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={t('loadFailed')} description={await describeError(err)} />
        </Panel>
      </>
    )
  }
}
