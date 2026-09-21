import { ErrorCodesTable } from '@/components/notifications/error-codes-table'
import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <>
      <PageHeader
        title="Mã lỗi API"
        subtitle="Mã lỗi mọi đường /v1, sao đúng máy chủ. Hướng dẫn đầy đủ: docs/huong-dan-tich-hop-cho-doi-app.md của ews-astrolink-api."
      />
      <ErrorCodesTable />
    </>
  )
}
