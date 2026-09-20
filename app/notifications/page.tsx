import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { NotificationsTable } from '@/components/notifications/notifications-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

export default function Page() {
  return (
    <>
      <PageHeader
        title="Lịch sử gửi"
        subtitle="Một bản ghi = một lần gửi, dù máy bắn (api) hay người soạn (dashboard)"
        actions={
          <Button variant="outline" render={<Link href="/notifications/errors" />}>
            <BookOpen /> Mã lỗi API
          </Button>
        }
      />
      <NotificationsTable />
    </>
  )
}
