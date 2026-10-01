import { ImportWizard } from '@/components/users/import-wizard'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/page-header'

export default async function Page() {
  const t = await getTranslations('import')
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <ImportWizard />
    </>
  )
}
