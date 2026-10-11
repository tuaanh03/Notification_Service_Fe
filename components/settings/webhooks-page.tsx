'use client'
import { useTranslations } from 'next-intl'
import { useApp } from '@/components/app-context'
import { PageHeader } from '@/components/page-header'
import { IncomingHooksPanel } from '@/components/settings/incoming-hooks-panel'
import { WebhooksPanel } from '@/components/settings/webhooks-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * `/settings/webhooks` — hai chiều webhook của app đang xem:
 *   Gửi đi  (outgoing, ADR-0029) — EWS gọi sang URL của app khi thư có kết quả
 *   Nhận vào (incoming, ADR-0030) — công cụ ngoài gọi vào URL bí mật để phát vào topic
 */
export function WebhooksPage() {
  const t = useTranslations('webhooks')
  const { app } = useApp()
  return (
    <>
      <PageHeader title={t('title')} subtitle={t('pageSubtitle', { app: app.slug })} />
      <Tabs defaultValue="outgoing">
        <TabsList className="mb-5 h-auto w-full flex-wrap sm:w-fit">
          <TabsTrigger value="outgoing">{t('tabOutgoing')}</TabsTrigger>
          <TabsTrigger value="incoming">{t('tabIncoming')}</TabsTrigger>
        </TabsList>
        <TabsContent value="outgoing">
          <WebhooksPanel embedded />
        </TabsContent>
        <TabsContent value="incoming">
          <IncomingHooksPanel />
        </TabsContent>
      </Tabs>
    </>
  )
}
