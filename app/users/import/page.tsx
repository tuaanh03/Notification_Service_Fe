import { ImportWizard } from '@/components/users/import-wizard'
import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <>
      <PageHeader
        title="Import CSV"
        subtitle="Dry-run 3 bước — preview trước, xác nhận mới ghi"
      />
      <ImportWizard />
    </>
  )
}
