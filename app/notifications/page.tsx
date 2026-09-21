import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { NotificationsTable } from '@/components/notifications/notifications-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

// `?externalId=` — lọc sẵn theo một người khi mở bằng link. Xem trọn một người (kèm cài đặt nhận
// tin) ở trang chi tiết `/users/[id]`.
export default async function Page({ searchParams }: { searchParams: Promise<{ externalId?: string | string[] }> }) {
  const { externalId } = await searchParams
  return (
    <>
      <PageHeader
        title="Lịch sử gửi"
        subtitle="Mỗi dòng là một lần app service gọi POST /v1/notifications. Màn này chỉ đọc."
        actions={
          <Button variant="outline" render={<Link href="/notifications/errors" />}>
            <BookOpen /> Mã lỗi API
          </Button>
        }
      />
      <NotificationsTable initialExternalId={typeof externalId === 'string' ? externalId : ''} />
    </>
  )
}
