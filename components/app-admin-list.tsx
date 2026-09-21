'use client'
import { AppLink, useAppRouter } from '@/components/app-link'
import { useState, useTransition } from 'react'
import { Database, Plus, ShieldAlert, TriangleAlert } from 'lucide-react'
import type { AppDto } from '@/lib/api/types'
import { fmtIso } from '@/lib/mock-data'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ApproveAppDialog } from '@/components/apps/approve-app-dialog'
import { AppTransitionDialog, type AppAction } from '@/components/apps/app-transition-dialog'
import { CredentialDialog } from '@/components/apps/credential-dialog'
import { approveAndIssueKeyAction, transitionAppAction, type ApproveResult } from '@/app/admin/apps/actions'

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

/**
 * Hành động cho phép theo trạng thái — SAO ĐÚNG bảng `APP_TRANSITIONS` của backend
 * (`app-transitions.ts`). `draft` chỉ có `submit`, việc đó thuộc wizard nên để trống.
 * `revoked` là trạng thái KẾT THÚC: không có dòng, nên không có nút.
 */
const ACTIONS_BY_STATUS: Record<string, readonly AppAction[]> = {
  active: ['suspend', 'revoke'],
  suspended: ['resume', 'revoke'],
}

const ACTION_LABEL: Record<AppAction, string> = {
  suspend: 'Tạm ngưng',
  resume: 'Mở lại',
  revoke: 'Thu hồi',
}

/**
 * Cột hành động. `Column.key` là `keyof AppDto` nên mượn `id` — field này không hiện ở cột nào
 * khác, và `render` bỏ qua giá trị.
 *
 * Trạng thái nào không có đường đi hợp lệ thì để trống, không dựng nút rồi để backend trả 409.
 */
const actionColumn = (
  onApprove: (app: AppDto) => void,
  onTransition: (app: AppDto, action: AppAction) => void,
): Column<AppDto> => ({
  key: 'id',
  label: 'Hành động',
  render: (app) => {
    if (app.status === 'pending_approval') {
      return (
        <Button size="sm" variant="outline" onClick={() => onApprove(app)}>
          Duyệt
        </Button>
      )
    }
    const actions = ACTIONS_BY_STATUS[app.status] ?? []
    if (actions.length === 0) return <span className="text-[var(--text-muted)]">—</span>
    return (
      <span className="flex gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            size="sm"
            variant={action === 'revoke' ? 'ghost' : 'outline'}
            className={action === 'revoke' ? 'text-[var(--supernova)]' : undefined}
            onClick={() => onTransition(app, action)}
          >
            {ACTION_LABEL[action]}
          </Button>
        ))}
      </span>
    )
  },
})
// Cột "Số topic" và "Người liên hệ kỹ thuật" của bản mock đã bỏ: AppDto chưa có
// hai field đó. Thêm lại khi backend bổ sung, đừng dựng số giả trên màn quản trị.

/**
 * UC-001 §A — /admin/apps (Super Admin). Dữ liệu do Server Component truyền vào.
 *
 * Đây là CỬA DUYỆT CHÍNH. Wizard bước 4 chỉ là lối tắt cho người vừa tạo xong; phiên đó đóng
 * lại là mất, nên app `pending_approval` phải duyệt được từ đây.
 */
export function AppAdminList({ rows }: { rows: AppDto[] }) {
  const router = useAppRouter()
  const [target, setTarget] = useState<AppDto | null>(null)
  const [transitionTarget, setTransitionTarget] = useState<{ app: AppDto; action: AppAction } | null>(null)
  const [result, setResult] = useState<ApproveResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const approve = (grant: Parameters<typeof approveAndIssueKeyAction>[1]) =>
    startTransition(async () => {
      if (!target) return
      setError(null)
      const res = await approveAndIssueKeyAction(target.id, grant)
      if (!res.ok) return setError(res.message)
      setTarget(null)
      setResult(res.data)
      // Dòng vừa duyệt phải đổi sang `active` ngay — Server Component đọc lại /admin/apps.
      router.refresh()
    })

  const transition = (reason: string) =>
    startTransition(async () => {
      if (!transitionTarget) return
      setError(null)
      const res = await transitionAppAction(transitionTarget.app.id, transitionTarget.action, reason)
      if (!res.ok) return setError(res.message)
      setTransitionTarget(null)
      router.refresh()
    })

  return (
    <>
      <PageHeader
        title="Tất cả app"
        subtitle="Quản lý đăng ký publisher và quyền gửi trong EWS Tổng"
        actions={
          <Button render={<AppLink href="/apps/new" />}>
            <Plus />
            Đăng ký App Service
          </Button>
        }
      />

      {result?.stoppedAt && (
        <Alert variant="destructive" className="mb-5">
          <TriangleAlert />
          <AlertTitle>Đã duyệt {result.app.name}, nhưng chưa cấp được khoá</AlertTitle>
          <AlertDescription>
            {result.stoppedAt.message} App đã <span className="font-mono">active</span> — vào{' '}
            <AppLink href="/settings/credentials" className="underline">Khoá API</AppLink> cấp lại.
          </AlertDescription>
        </Alert>
      )}

      <DataTable<AppDto>
        columns={[...columns, actionColumn(setTarget, (app, action) => setTransitionTarget({ app, action }))]}
        rows={rows}
        filterKey="status"
        empty={<EmptyState icon={Database} title="Không có app" description="Không app nào ở trạng thái này." />}
      />

      <ApproveAppDialog
        app={target}
        pending={pending}
        error={error}
        onCancel={() => {
          setTarget(null)
          setError(null)
        }}
        onConfirm={approve}
      />

      {/*
        `key` theo app + hành động: đổi mục tiêu là React DỰNG LẠI dialog, nên ô Lý do trống.
        Không có nó, `reason` sống sót qua lần đóng thành công (parent chỉ set target = null,
        `onCancel` không chạy) -> lý do của lần Tạm ngưng trước bị ghi cho lần Thu hồi sau.
        Đúng thứ mà việc bắt buộc nhập lý do định ngăn.
      */}
      <AppTransitionDialog
        key={transitionTarget ? `${transitionTarget.app.id}:${transitionTarget.action}` : 'idle'}
        app={transitionTarget?.app ?? null}
        action={transitionTarget?.action ?? 'suspend'}
        pending={pending}
        error={error}
        onCancel={() => {
          setTransitionTarget(null)
          setError(null)
        }}
        onConfirm={transition}
      />

      {result?.secret && (
        <CredentialDialog
          app={result.app}
          apiKey={result.secret.apiKey}
          open
          onClose={() => setResult(null)}
        />
      )}
    </>
  )
}
