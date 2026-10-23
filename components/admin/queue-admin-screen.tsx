'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'
import { DeliveryOverview } from '@/components/admin/delivery-overview'
import { QueueDeadLettersTab } from '@/components/admin/queue-dead-letters-tab'
import { QueueStreamsTab } from '@/components/admin/queue-streams-tab'
import { PageHeader } from '@/components/page-header'
import { UNDERLINE_TAB_LIST, UNDERLINE_TAB_TRIGGER } from '@/components/templates/tab-styles'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DeadLetterDto, DeliveryQueueDto, QueuesDto } from '@/lib/api/types'
import { queueTabOf, type QueueTab } from '@/lib/queue-tabs'

/**
 * `/admin/queue` — Hàng chờ gửi: Tổng quan (ADR-0041) · Stream · Message lỗi (ADR-0042 của backend). Dữ liệu cả ba tab đọc
 * sẵn ở server; đổi tab chỉ thay `?tab=` (không tải lại), Làm mới = `router.refresh()`.
 */
export function QueueAdminScreen({
  initialTab,
  overview,
  queues,
  letters,
}: {
  initialTab: QueueTab
  overview: DeliveryQueueDto
  queues: QueuesDto
  letters: DeadLetterDto[]
}) {
  const t = useTranslations('deliveryQueue')
  const tq = useTranslations('queueAdmin')
  const format = useFormatter()
  const router = useRouter()
  const [tab, setTabState] = useState<QueueTab>(initialTab)
  const [refreshing, startRefresh] = useTransition()

  const setTab = (next: QueueTab) => {
    setTabState(next)
    const params = new URLSearchParams(window.location.search)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }
  const deadLetters = queues.groups.reduce((sum, g) => sum + g.deadLetters, 0)
  const paused = queues.groups.filter((g) => g.paused).length

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button variant="outline" size="sm" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            <RefreshCw className={refreshing ? 'animate-spin' : undefined} /> {t('refresh')}
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(queueTabOf(String(v)))}>
        <TabsList variant="line" className={`${UNDERLINE_TAB_LIST} mb-5 border-b`}>
          <TabsTrigger value="overview" className={UNDERLINE_TAB_TRIGGER} data-testid="queue-tab-overview">
            {tq('overviewTab')}
          </TabsTrigger>
          <TabsTrigger value="streams" className={UNDERLINE_TAB_TRIGGER} data-testid="queue-tab-streams">
            {tq('streamsTab')}
            {paused > 0 && <span className="ml-1 text-[var(--solar)]">{tq('pausedCount', { count: paused })}</span>}
          </TabsTrigger>
          <TabsTrigger value="errors" className={UNDERLINE_TAB_TRIGGER} data-testid="queue-tab-errors">
            {tq('errorsTab')}
            {deadLetters > 0 && <span className="ml-1 tabular-nums text-[var(--supernova)]">({format.number(deadLetters)})</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <DeliveryOverview queue={overview} />
        </TabsContent>
        <TabsContent value="streams">
          <QueueStreamsTab queues={queues} onShowErrors={() => setTab('errors')} />
        </TabsContent>
        <TabsContent value="errors">
          <QueueDeadLettersTab letters={letters} />
        </TabsContent>
      </Tabs>
    </>
  )
}
