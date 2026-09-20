import { ErrorCodesTable } from '@/components/notifications/error-codes-table'
import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <>
      <PageHeader
        title="Mã lỗi API"
        subtitle="Bảng tra cho developer tích hợp POST /v1/notifications"
      />
      <ErrorCodesTable />
    </>
  )
}
