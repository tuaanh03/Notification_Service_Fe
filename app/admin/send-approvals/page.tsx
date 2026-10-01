import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/page-header'
import { SendApprovalsTable } from '@/components/admin/send-approvals-table'

export default async function SendApprovalsPage() {
  const t = await getTranslations('sendApprovals')
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <SendApprovalsTable />
    </div>
  )
}
