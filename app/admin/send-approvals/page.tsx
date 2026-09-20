import { PageHeader } from '@/components/page-header'
import { SendApprovalsTable } from '@/components/admin/send-approvals-table'

export default function SendApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Duyệt lần gửi"
        subtitle="Các lô gửi vượt ngưỡng hoặc vào topic bắt buộc."
      />
      <SendApprovalsTable />
    </div>
  )
}
