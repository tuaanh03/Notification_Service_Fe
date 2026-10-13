'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Copy, Lock, LockOpen, MoreHorizontal, Pause, Play, Plus, PlugZap, RadioTower } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  createTopicAction,
  loadTopicsAction,
  setTopicMandatoryAction,
  transitionTopicAction,
} from '@/app/topics/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill, useStatusLabel } from '@/components/status-pill'
import { useApp } from '@/components/app-context'
import { useRole } from '@/components/role-context'
import { CreateTopicDialog } from '@/components/topics/create-topic-dialog'
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
import type { CreateTopicInput, TopicAction } from '@/lib/api/topics'
import type { TopicDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

type Row = TopicDto & Record<string, unknown>

/** Nhãn nút theo TOPIC_TRANSITIONS của backend — trạng thái nào không có nhánh thì không có nút. */
const NEXT_ACTION: Readonly<Record<string, { action: TopicAction; icon: typeof Play }>> = {
  draft: { action: 'activate', icon: Play },
  suspended: { action: 'activate', icon: Play },
  active: { action: 'suspend', icon: Pause },
}

/** Nhãn `defaultMode` (khoá trong nhóm `topics`); giá trị lạ hiện nguyên. */
const DEFAULT_MODE_KEY = { opt_out: 'modeOptOut', opt_in: 'modeOptIn' } as const
const isKnownMode = (m: string): m is keyof typeof DEFAULT_MODE_KEY => m in DEFAULT_MODE_KEY

export function TopicsPage() {
  const t = useTranslations('topics')
  const statusLabel = useStatusLabel()
  const te = useTranslations('errors')
  const { app } = useApp()
  // App Viewer chỉ xem — ẩn nút ghi (backend vẫn chặn bằng 403, đây chỉ để giao diện gọn).
  const writable = useRole().canManage(app)
  const [rows, setRows] = useState<TopicDto[] | null>(null)
  /** Lỗi lúc NẠP danh sách — màn hình không có dữ liệu để vẽ. */
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Lỗi lúc GHI — danh sách vẫn còn, chỉ thao tác vừa rồi thất bại. */
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [suspending, setSuspending] = useState<TopicDto | null>(null)
  const [pending, startTransition] = useTransition()

  const appId = app.app_id

  const load = useCallback(async () => {
    const result = await loadTopicsAction(appId)
    if (result.ok) {
      setRows(result.data)
      setLoadError(null)
    } else {
      setRows(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, te])

  // Đổi app trên switcher là đổi hẳn tập chủ đề: xoá dữ liệu cũ trước khi nạp,
  // tránh hiện chủ đề của app trước trong lúc chờ.
  useEffect(() => {
    setRows(null)
    setLoadError(null)
    setActionError(null)
    void load()
  }, [load])

  const handleCreate = (input: CreateTopicInput) => {
    startTransition(async () => {
      const result = await createTopicAction(appId, input)
      if (!result.ok) {
        setActionError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setActionError(null)
      setCreating(false)
      toast.success(t('created', { key: result.data.key }))
      await load()
    })
  }

  const handleTransition = (topic: TopicDto, action: TopicAction) => {
    startTransition(async () => {
      const result = await transitionTopicAction(appId, topic.key, action)
      if (!result.ok) {
        setActionError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setActionError(null)
      setSuspending(null)
      toast.success(
        action === 'activate'
          ? t('activated', { key: topic.key })
          : t('suspended', { key: topic.key }),
      )
      await load()
    })
  }

  // Đặt / bỏ bắt buộc: người quản lý app tự quyết, làm luôn không hỏi lại (lựa chọn cũ của người nhận
  // không mất — bỏ bắt buộc là họ quay về đúng như trước).
  const handleMandatory = (topic: TopicDto, mandatory: boolean) => {
    startTransition(async () => {
      const result = await setTopicMandatoryAction(appId, topic.key, mandatory)
      if (!result.ok) {
        setActionError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setActionError(null)
      toast.success(mandatory ? t('mandatorySet', { key: topic.key }) : t('mandatoryUnset', { key: topic.key }))
      await load()
    })
  }

  const columns: Column<Row>[] = [
    { key: 'key', label: t('colKey'), mono: true },
    { key: 'name', label: t('colName') },
    { key: 'status', label: t('colStatus'), render: (r) => <StatusPill status={r.status} /> },
    {
      key: 'defaultMode',
      label: t('colDefault'),
      render: (r) => (
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-help text-xs text-[var(--text-secondary)] underline decoration-dotted" />}>
            {isKnownMode(r.defaultMode) ? t(DEFAULT_MODE_KEY[r.defaultMode]) : r.defaultMode}
          </TooltipTrigger>
          <TooltipContent>
            {t.rich('defaultTip', { mode: r.defaultMode, mono: (chunks) => <span className="font-mono">{chunks}</span> })}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'mandatory',
      label: t('colMandatory'),
      render: (r) =>
        r.mandatory ? (
          <Tooltip>
            <TooltipTrigger render={<Badge variant="outline" className="border-[var(--solar)]/30 text-[9px] text-[var(--solar)]" />}>
              <Lock />
              {t('mandatoryBadge')}
            </TooltipTrigger>
            <TooltipContent>{t('mandatoryTip')}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: 'updatedAt', label: t('colUpdated'), mono: true, render: (r) => fmtDateTime(r.updatedAt) },
    {
      key: 'id',
      label: t('colActions'),
      align: 'right',
      render: (r) => {
        const next = NEXT_ACTION[r.status]
        const Icon = next?.icon
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('actionsFor', { key: r.key })}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 bg-popover border border-border shadow-md">
                {writable && next && Icon && (
                  <>
                    <DropdownMenuItem
                      variant={next.action === 'suspend' ? 'destructive' : 'default'}
                      disabled={pending}
                      className="text-xs cursor-pointer"
                      onClick={() =>
                        // Tạm dừng là chặn đường gửi của app đang chạy -> hỏi lại.
                        // Kích hoạt chỉ mở thêm đường, không phá gì -> làm luôn.
                        next.action === 'suspend' ? setSuspending(r) : handleTransition(r, 'activate')
                      }
                    >
                      <Icon className="size-3.5 mr-1.5" /> {t(next.action)}
                    </DropdownMenuItem>
                  </>
                )}
                {writable && (
                  <>
                    <DropdownMenuItem
                      disabled={pending}
                      className="text-xs cursor-pointer"
                      onClick={() => handleMandatory(r, !r.mandatory)}
                    >
                      {r.mandatory ? <LockOpen className="size-3.5 mr-1.5" /> : <Lock className="size-3.5 mr-1.5" />}
                      {r.mandatory ? t('unsetMandatory') : t('setMandatory')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-xs cursor-pointer"
                  onClick={() => {
                    void navigator.clipboard.writeText(r.key)
                    toast.success(t('copied', { key: r.key }))
                  }}
                >
                  <Copy className="size-3.5 mr-1.5" /> {t('copyKey')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const header = (
    <PageHeader
      title={t('title')}
      subtitle={t('subtitle', { app: app.name })}
      actions={
        writable ? (
          <Button className="gap-1.5 text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            {t('add')}
          </Button>
        ) : undefined
      }
    />
  )

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <Panel className="overflow-hidden">
          <EmptyState
            icon={PlugZap}
            title={t('loadFailed')}
            description={loadError}
            action={
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                {t('retry')}
              </Button>
            }
          />
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{t('actionFailed')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <DataTable<Row>
        rows={(rows ?? []) as Row[]}
        columns={columns}
        filterKey="status"
        chipLabel={statusLabel}
        searchPlaceholder={t('searchPlaceholder')}
        empty={
          rows === null ? (
            <EmptyState icon={RadioTower} title={t('loading')} description={t('loadingBody')} />
          ) : (
            <EmptyState
              icon={RadioTower}
              title={t('emptyTitle')}
              description={t('emptyBody', { app: app.name })}
            />
          )
        }
      />

      <CreateTopicDialog
        open={creating}
        appName={app.name}
        pending={pending}
        onCancel={() => setCreating(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={suspending !== null}
        title={t('suspendTitle')}
        description={t('suspendBody')}
        facts={
          suspending
            ? [
                [t('factTopic'), suspending.key],
                [t('factApp'), app.namespace],
                [t('factAfter'), 'suspended'],
              ]
            : undefined
        }
        confirmLabel={pending ? t('suspending') : t('suspendConfirm')}
        confirmDisabled={pending}
        onConfirm={() => suspending && handleTransition(suspending, 'suspend')}
        onCancel={() => setSuspending(null)}
      />
    </div>
  )
}
