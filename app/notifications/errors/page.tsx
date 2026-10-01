import { ErrorCodesTable } from '@/components/notifications/error-codes-table'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/page-header'

export default async function Page() {
  const t = await getTranslations('notifications')
  return (
    <>
      <PageHeader
        title={t('errorCodes')}
        subtitle={t('errorCodesSubtitle')}
      />
      <ErrorCodesTable />
    </>
  )
}
