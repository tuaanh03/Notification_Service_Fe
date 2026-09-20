'use client'
import Link from 'next/link'
import { Database, Plus, ShieldAlert } from 'lucide-react'
import { apps, type App } from '@/lib/mock-data'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const columns: Column<App>[] = [
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
    key: 'granted_channels',
    label: 'Kênh được cấp',
    render: (app) => (
      <span className="flex gap-1">
        {app.granted_channels.map((c) => (
          <Badge key={c} variant="outline" className="font-mono text-[10px]">
            {c}
          </Badge>
        ))}
      </span>
    ),
  },
  { key: 'quota', label: 'Quota', numeric: true, render: (app) => <>{app.quota}/min</> },
  { key: 'topic_count', label: 'Số topic', numeric: true },
  { key: 'technical_contact', label: 'Người liên hệ kỹ thuật' },
  { key: 'updated_at', label: 'Cập nhật' },
]

/** UC-001 §A — /admin/apps (Super Admin). */
export function AppAdminList() {
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
      <DataTable<App>
        columns={columns}
        rows={apps}
        filterKey="status"
        empty={<EmptyState icon={Database} title="Không có app" description="Không app nào ở trạng thái này." />}
      />
    </>
  )
}
