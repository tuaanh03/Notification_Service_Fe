import { PlugZap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { QueueAdminScreen } from '@/components/admin/queue-admin-screen'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { getDeliveryQueue } from '@/lib/api/delivery-queue'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'
import { getQueues, listDeadLetters } from '@/lib/api/queues'
import { queueTabOf } from '@/lib/queue-tabs'

/**
 * Hàng chờ gửi — Tổng quan (ADR-0041 của backend), Stream và Message lỗi (ADR-0042). Đọc cả ba ở server bằng phiên của
 * Super Admin; `?tab=streams|errors` chọn tab mở sẵn.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  try {
    const [overview, queues, letters] = await Promise.all([getDeliveryQueue(), getQueues(), listDeadLetters()])
    return <QueueAdminScreen initialTab={queueTabOf(tab)} overview={overview} queues={queues} letters={letters} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    const t = await getTranslations('deliveryQueue')
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
