'use client'
import { AppLink, useAppRouter } from '@/components/app-link'
import { useAppSelection } from '@/components/app-context'
import { tOr } from '@/i18n/dynamic'
import { appKey } from '@/lib/app-routes'
import { useState, useTransition } from 'react'
import { Ban, Check, Copy, Database, MoreHorizontal, Network, Pause, Play, Plus, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { AppDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusPill, useStatusLabel } from '@/components/status-pill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ApproveAppDialog } from '@/components/apps/approve-app-dialog'
import { AppTransitionDialog, type AppAction } from '@/components/apps/app-transition-dialog'
import { CredentialDialog } from '@/components/apps/credential-dialog'
import { approveAndIssueKeyAction, transitionAppAction, type ApproveResult } from '@/app/admin/apps/actions'

/** Cột của bảng — trong hook vì nhãn và định dạng số theo ngôn ngữ đang chọn. */
function useColumns(): Column<AppDto>[] {
  const t = useTranslations('allApps')
  const tch = useTranslations('channels')
  const format = useFormatter()
  return [
  {
    key: 'name',
    label: t('colName'),
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
              {t('external')}
            </TooltipTrigger>
            <TooltipContent>{t('externalTip')}</TooltipContent>
          </Tooltip>
        )}
      </span>
    ),
  },
  { key: 'slug', label: t('colSlug'), mono: true },
  {
    key: 'namespace',
    label: t('colNamespace'),
    render: (app) => <span className="font-mono text-xs text-[var(--starlight)]">{app.namespace}</span>,
  },
  { key: 'status', label: t('colStatus'), render: (app) => <StatusPill status={app.status} /> },
  {
    key: 'grantedChannels',
    label: t('colChannels'),
    render: (app) => (
      <span className="flex gap-1">
        {app.grantedChannels.map((c) => (
          <Badge key={c} variant="outline" className="text-[10px]">
            {tOr(tch, c)}
          </Badge>
        ))}
      </span>
    ),
  },
  { key: 'rateLimitPerMinute', label: t('colQuota'), numeric: true, render: (app) => <>{t('perMin', { count: app.rateLimitPerMinute })}</> },
  {
    key: 'maxRecipientsPerEvent',
    label: t('colMaxRecipients'),
    numeric: true,
    render: (app) => <>{format.number(app.maxRecipientsPerEvent)}</>,
  },
  { key: 'updatedAt', label: t('colUpdated'), render: (app) => <span className="tabular-nums">{fmtDateTime(app.updatedAt)}</span> },
]
}

/**
 * Hành động cho phép theo trạng thái — SAO ĐÚNG bảng `APP_TRANSITIONS` của backend
 * (`app-transitions.ts`). `draft` chỉ có `submit`, việc đó thuộc wizard nên để trống.
 * `revoked` là trạng thái KẾT THÚC: không có dòng, nên không có nút.
 */
const ACTIONS_BY_STATUS: Record<string, readonly AppAction[]> = {
  active: ['suspend', 'revoke'],
  suspended: ['resume', 'revoke'],
}

/** Nhãn = khoá cùng tên trong nhóm `allApps` (`suspend` / `resume` / `revoke`). */
const ACTION_ICON: Record<AppAction, typeof Pause> = { suspend: Pause, resume: Play, revoke: Ban }

/**
 * Cột thao tác (nút ⋯). `Column.key` là `keyof AppDto` nên mượn `id` — field này không hiện ở cột
 * nào khác, và `render` bỏ qua giá trị.
 *
 * Trạng thái nào không có đường đi hợp lệ thì không có mục đổi trạng thái, không dựng mục rồi để
 * backend trả 409. Mọi mục đều mở dialog (dấu "…"), không làm ngay. Thu hồi là trạng thái KẾT
 * THÚC nên tách riêng và tô đỏ.
 */
const actionColumn = (
  t: ReturnType<typeof useTranslations<'allApps'>>,
  onApprove: (app: AppDto) => void,
  onTransition: (app: AppDto, action: AppAction) => void,
  onNetwork: (app: AppDto) => void,
): Column<AppDto> => ({
  key: 'id',
  label: t('colActions'),
  align: 'right',
  render: (app) => {
    const actions = ACTIONS_BY_STATUS[app.status] ?? []
    const reversible = actions.filter((action) => action !== 'revoke')
    return (
      // Bấm dòng = mở app. Menu ⋯ (kể cả các mục trong portal — sự kiện React vẫn nổi qua đây)
      // không được tính là bấm dòng.
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('actionsFor', { name: app.name })}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 bg-popover border border-border shadow-md">
            {app.status === 'pending_approval' && (
              <>
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => onApprove(app)}>
                  <Check className="size-3.5 mr-1.5" /> {t('approve')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {reversible.map((action) => {
              const Icon = ACTION_ICON[action]
              return (
                <DropdownMenuItem key={action} className="text-xs cursor-pointer" onClick={() => onTransition(app, action)}>
                  <Icon className="size-3.5 mr-1.5" /> {t(action)}
                </DropdownMenuItem>
              )
            })}
            {reversible.length > 0 && <DropdownMenuSeparator />}
            {actions.includes('revoke') && (
              <>
                <DropdownMenuItem
                  variant="destructive"
                  className="text-xs cursor-pointer"
                  onClick={() => onTransition(app, 'revoke')}
                >
                  <Ban className="size-3.5 mr-1.5" /> {t('revoke')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => onNetwork(app)}>
              <Network className="size-3.5 mr-1.5" /> {t('network')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs cursor-pointer"
              onClick={() => {
                void navigator.clipboard.writeText(app.id)
                toast.success(t('copied'))
              }}
            >
              <Copy className="size-3.5 mr-1.5" /> {t('copyId')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  },
})
// Cột "Số topic" và "Người liên hệ kỹ thuật" của bản mock đã bỏ: AppDto chưa có
// hai field đó. Thêm lại khi backend bổ sung, đừng dựng số giả trên màn quản trị.

/**
 * UC-001 §A — /admin/apps (Super Admin). Dữ liệu do Server Component truyền vào.
 *
 * App tự phục vụ (ADR-0023 của backend): tạo xong là `active`, không còn hàng chờ duyệt. Ở đây
 * Super Admin tạm ngưng / thu hồi app rác; nút Duyệt chỉ còn cho app CŨ đang `pending_approval`.
 * Bấm một dòng = mở app đó ở console app (Super Admin thấy mọi org).
 */
export function AppAdminList({ rows }: { rows: AppDto[] }) {
  const t = useTranslations('allApps')
  const statusLabel = useStatusLabel()
  const columns = useColumns()
  const router = useAppRouter()
  // Chỉ mở app mà console app thấy được (`?app=<app_id>`) — app ngoài danh sách thì không có link.
  const { apps } = useAppSelection()
  const keyOf = (appId: string) => {
    const found = apps.find((a) => a.app_id === appId)
    return found ? appKey(found) : null
  }
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
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button nativeButton={false} render={<AppLink href="/apps/new" />}>
            <Plus />
            {t('register')}
          </Button>
        }
      />

      {result?.stoppedAt && (
        <Alert variant="destructive" className="mb-5">
          <TriangleAlert />
          <AlertTitle>{t('noKeyTitle', { name: result.app.name })}</AlertTitle>
          <AlertDescription>
            {t.rich('noKeyBody', {
              message: result.stoppedAt.message,
              mono: (chunks) => <span className="font-mono">{chunks}</span>,
              link: (chunks) => (
                <AppLink href="/settings/credentials" app={keyOf(result.app.app_id)} className="underline">
                  {chunks}
                </AppLink>
              ),
            })}
          </AlertDescription>
        </Alert>
      )}

      <DataTable<AppDto>
        columns={[
          ...columns,
          actionColumn(
            t,
            setTarget,
            (app, action) => setTransitionTarget({ app, action }),
            (app) => router.push(`/admin/apps/${encodeURIComponent(app.id)}/network`),
          ),
        ]}
        rows={rows}
        onRowClick={(row) => {
          const key = keyOf(row.id)
          if (key) router.push('/', { app: key })
        }}
        filterKey="status"
        chipLabel={statusLabel}
        empty={<EmptyState icon={Database} title={t('emptyTitle')} description={t('emptyBody')} />}
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
