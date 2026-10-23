import { PlugZap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { DeliveryQueuePanel } from '@/components/admin/delivery-queue-panel'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { getDeliveryQueue } from '@/lib/api/delivery-queue'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'

/**
 * Hàng chờ gửi (ADR-0041 của backend) — hộp gửi chung còn bao nhiêu lượt hôm nay, app nào đang chiếm hàng chờ, thư mới
 * đợi khoảng bao lâu. Đọc ở server bằng phiên của Super Admin; nút Làm mới đọc lại cả trang.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    return <DeliveryQueuePanel queue={await getDeliveryQueue()} />
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
