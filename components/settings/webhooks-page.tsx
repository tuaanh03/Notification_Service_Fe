'use client'
import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useApp } from '@/components/app-context'
import { AppLink } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { IncomingHooksPanel } from '@/components/settings/incoming-hooks-panel'
import { WebhooksPanel } from '@/components/settings/webhooks-panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GUIDE_ANCHOR, guidePath } from '@/lib/app-routes'

type Tab = 'outgoing' | 'incoming'

/**
 * `/settings/webhooks` — hai chiều webhook của app đang xem:
 *   Gửi đi  (outgoing, ADR-0029) — EWS gọi sang URL của app khi thư có kết quả
 *   Nhận vào (incoming, ADR-0030) — công cụ ngoài gọi vào URL bí mật để phát vào topic
 * Giải thích dài (chữ ký, gọi lại, ánh xạ JSON) nằm ở trang Hướng dẫn — nút "Hướng dẫn" mở đúng mục của tab đang xem.
 */
export function WebhooksPage() {
  const t = useTranslations('webhooks')
  const { app } = useApp()
  const [tab, setTab] = useState<Tab>('outgoing')
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('pageSubtitle', { app: app.slug })}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<AppLink href={guidePath(tab === 'outgoing' ? GUIDE_ANCHOR.webhookOut : GUIDE_ANCHOR.webhookIn)} />}
          >
            <BookOpen /> {t('guide')}
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v === 'incoming' ? 'incoming' : 'outgoing')}>
        <TabsList className="mb-5 h-auto w-full flex-wrap gap-1 sm:w-fit">
          <TabsTrigger value="outgoing" className="px-2.5">{t('tabOutgoing')}</TabsTrigger>
          <TabsTrigger value="incoming" className="px-2.5">{t('tabIncoming')}</TabsTrigger>
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
