import { AppLink } from '@/components/app-link'
import { BookOpen } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { NotificationsTable } from '@/components/notifications/notifications-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

// `?externalId=` — lọc sẵn theo một người khi mở bằng link. Xem trọn một người (kèm cài đặt nhận
// tin) ở trang chi tiết `/users/[id]`.
export default async function Page({ searchParams }: { searchParams: Promise<{ externalId?: string | string[] }> }) {
  const { externalId } = await searchParams
  const t = await getTranslations('notifications')
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button nativeButton={false} variant="outline" render={<AppLink href="/notifications/errors" />}>
            <BookOpen /> {t('errorCodes')}
          </Button>
        }
      />
      <NotificationsTable initialExternalId={typeof externalId === 'string' ? externalId : ''} />
    </>
  )
}
