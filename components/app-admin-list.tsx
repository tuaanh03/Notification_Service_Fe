'use client'
import Link from 'next/link'
import { Database, Plus, ShieldAlert } from 'lucide-react'
import type { AppDto } from '@/lib/api/types'
import { fmtIso } from '@/lib/mock-data'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const columns: Column<AppDto>[] = [
  {
    key: 'name',
    label: 'Tên app',
    render: (app) => (
      <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
        {app.name}
        {app.origin === 'external' && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge variant="outline" className="border-[var(--solar)]/30 text-[9px] text-[var(--solar)]" />
              }
            >
              <ShieldAlert />
              ngoài mạng
            </TooltipTrigger>
            <TooltipContent>App nằm ngoài mạng nội bộ — bắt buộc khai ip_allowlist</TooltipContent>
          </Tooltip>
        )}
      </span>
    ),
  },
  { key: 'slug', label: 'slug', mono: true },
  {
    key: 'namespace',
    label: 'topic_namespace',
    render: (app) => <span className="font-mono text-xs text-[var(--starlight)]">{app.namespace}</span>,
  },
  { key: 'status', label: 'Trạng thái', render: (app) => <StatusPill status={app.status} /> },
  {
    key: 'grantedChannels',
    label: 'Kênh được cấp',
    render: (app) => (
      <span className="flex gap-1">
        {app.grantedChannels.map((c) => (
          <Badge key={c} variant="outline" className="font-mono text-[10px]">
            {c}
          </Badge>
        ))}
      </span>
    ),
  },
  { key: 'rateLimitPerMinute', label: 'Quota', numeric: true, render: (app) => <>{app.rateLimitPerMinute}/min</> },
  {
    key: 'maxRecipientsPerEvent',
    label: 'Tối đa người nhận',
    numeric: true,
    render: (app) => <>{app.maxRecipientsPerEvent.toLocaleString('vi-VN')}</>,
  },
  { key: 'updatedAt', label: 'Cập nhật', mono: true, render: (app) => <>{fmtIso(app.updatedAt)}</> },
]
// Cột "Số topic" và "Người liên hệ kỹ thuật" của bản mock đã bỏ: AppDto chưa có
// hai field đó. Thêm lại khi backend bổ sung, đừng dựng số giả trên màn quản trị.

/** UC-001 §A — /admin/apps (Super Admin). Dữ liệu do Server Component truyền vào. */
export function AppAdminList({ rows }: { rows: AppDto[] }) {
  return (
    <>
      <PageHeader
        title="Tất cả app"
        subtitle="Quản lý đăng ký publisher và quyền gửi trong EWS Tổng"
        actions={
          <Button render={<Link href="/apps/new" />}>
            <Plus />
            Đăng ký App Service
          </Button>
        }
      />
      <DataTable<AppDto>
        columns={columns}
        rows={rows}
        filterKey="status"
        empty={<EmptyState icon={Database} title="Không có app" description="Không app nào ở trạng thái này." />}
      />
    </>
  )
}
