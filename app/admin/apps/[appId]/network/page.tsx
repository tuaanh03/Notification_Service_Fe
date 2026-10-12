import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { NetworkRulesPanel } from '@/components/admin/network-rules-panel'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { PlugZap } from 'lucide-react'
import { getApp } from '@/lib/api/apps'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'

/**
 * `/admin/apps/<appId>/network` — Giới hạn IP của một app, chỉ Super Admin (layout `/admin` chặn người
 * khác; backend đòi `platform.manage` — bổ sung ADR-0023). Đọc app ở server để có slug cho tiêu đề.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  try {
    const app = await getApp(appId)
    return <NetworkRulesPanel app={{ id: app.id, slug: app.slug, external: app.origin === 'external' }} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    if (err.status === 404) notFound()
    const t = await getTranslations('network')
    return (
      <>
        <PageHeader title={t('title')} />
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={t('loadFailed')} description={await describeError(err)} />
        </Panel>
      </>
    )
  }
}
