'use client'
import { useAppRouter } from '@/components/app-link'
import { ClipboardCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusPill } from '@/components/status-pill'
import { sendApprovals, type SendApproval } from '@/lib/mock-data'

type Row = SendApproval & Record<string, unknown>

/** UC-008 §F — danh sách lần gửi chờ Super Admin duyệt. */
export function SendApprovalsTable() {
  const t = useTranslations('sendApprovals')
  const router = useAppRouter()
  const columns: Column<Row>[] = [
    { key: 'id', label: t('colRequest'), mono: true },
    { key: 'topic_key', label: t('colTopic'), mono: true },
    { key: 'template', label: t('colTemplate'), mono: true },
    { key: 'estimate', label: t('colEstimate'), numeric: true },
    { key: 'author', label: t('colAuthor'), mono: true },
    { key: 'status', label: t('colStatus'), render: (r) => <StatusPill status={r.status} /> },
  ]
  return (
    <DataTable<Row>
      columns={columns}
      rows={sendApprovals as Row[]}
      onRowClick={(r) => router.push(`/admin/send-approvals/${r.id}`)}
      empty={<EmptyState icon={ClipboardCheck} title={t('emptyTitle')} description={t('emptyBody')} />}
    />
  )
}
