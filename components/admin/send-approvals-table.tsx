'use client'
import { useAppRouter } from '@/components/app-link'
import { ClipboardCheck } from 'lucide-react'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusPill } from '@/components/status-pill'
import { sendApprovals, type SendApproval } from '@/lib/mock-data'

type Row = SendApproval & Record<string, unknown>
const columns: Column<Row>[] = [
  { key: 'id', label: 'Yêu cầu', mono: true },
  { key: 'topic_key', label: 'Topic', mono: true },
  { key: 'template', label: 'Template', mono: true },
  { key: 'estimate', label: 'Người nhận (ước lượng)', numeric: true },
  { key: 'author', label: 'Soạn bởi', mono: true },
  { key: 'status', label: 'Trạng thái', render: (r) => <StatusPill status={r.status} /> },
]

/** UC-008 §F — danh sách lần gửi chờ Super Admin duyệt. */
export function SendApprovalsTable() {
  const router = useAppRouter()
  return (
    <DataTable<Row>
      columns={columns}
      rows={sendApprovals as Row[]}
      onRowClick={(r) => router.push(`/admin/send-approvals/${r.id}`)}
      empty={<EmptyState icon={ClipboardCheck} title="Không có yêu cầu" description="Chưa có lần gửi nào chờ duyệt." />}
    />
  )
}
