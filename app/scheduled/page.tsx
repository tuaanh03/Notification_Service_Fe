import { ScheduledCards } from '@/components/notifications/scheduled-cards'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/page-header'

export default async function Page() {
  const t = await getTranslations('notifications')
  return (
    <>
      <PageHeader title={t('scheduledTitle')} subtitle={t('scheduledSubtitle')} />
      <ScheduledCards />
    </>
  )
}
