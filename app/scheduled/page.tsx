import { ScheduledCards } from '@/components/notifications/scheduled-cards'
import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <>
      <PageHeader title="Đã lên lịch" subtitle="Lần gửi chờ tới giờ chạy — nội dung đã khoá" />
      <ScheduledCards />
    </>
  )
}
