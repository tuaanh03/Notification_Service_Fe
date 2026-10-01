import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/page-header'
import { AppRegistrationWizard } from '@/components/app-registration-wizard'
export default async function Page() {
  const t = await getTranslations('wizard')
  return (
    <>
      <PageHeader
        title={t('pageTitle')}
        subtitle={t('pageSubtitle')}
      />
      <AppRegistrationWizard />
    </>
  )
}
