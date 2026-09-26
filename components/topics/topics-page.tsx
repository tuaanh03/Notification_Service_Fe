'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Copy, Lock, MoreHorizontal, Pause, Play, Plus, PlugZap, RadioTower } from 'lucide-react'
import { toast } from 'sonner'
import {
  createTopicAction,
  loadTopicsAction,
  transitionTopicAction,
} from '@/app/topics/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { useApp } from '@/components/app-context'
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
import { fmtIso } from '@/lib/mock-data'

type Row = TopicDto & Record<string, unknown>

/** Nhãn nút theo TOPIC_TRANSITIONS của backend — trạng thái nào không có nhánh thì không có nút. */
const NEXT_ACTION: Readonly<Record<string, { action: TopicAction; label: string; icon: typeof Play }>> = {
  draft: { action: 'activate', label: 'Kích hoạt', icon: Play },
  suspended: { action: 'activate', label: 'Kích hoạt', icon: Play },
  active: { action: 'suspend', label: 'Tạm dừng', icon: Pause },
}

const DEFAULT_MODE_LABEL: Readonly<Record<string, string>> = {
  opt_out: 'Có nhận',
  opt_in: 'Không nhận',
}

export function TopicsPage() {
  const { app } = useApp()
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
      setLoadError(`${result.message} (mã: ${result.code})`)
    }
  }, [appId])

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
        setActionError(`${result.message} (mã: ${result.code})`)
        return
      }
      setActionError(null)
      setCreating(false)
      toast.success(`Đã tạo chủ đề "${result.data.key}" ở trạng thái draft`)
      await load()
    })
  }

  const handleTransition = (topic: TopicDto, action: TopicAction) => {
    startTransition(async () => {
      const result = await transitionTopicAction(appId, topic.key, action)
      if (!result.ok) {
        setActionError(`${result.message} (mã: ${result.code})`)
        return
      }
      setActionError(null)
      setSuspending(null)
      toast.success(
        action === 'activate'
          ? `Đã kích hoạt "${topic.key}" — app gửi được ngay`
          : `Đã tạm dừng "${topic.key}" — app không gửi được trên chủ đề này`,
      )
      await load()
    })
  }

  const columns: Column<Row>[] = [
    { key: 'key', label: 'Mã chủ đề', mono: true },
    { key: 'name', label: 'Tên hiển thị' },
    { key: 'status', label: 'Trạng thái', render: (r) => <StatusPill status={r.status} /> },
    {
      key: 'defaultMode',
      label: 'Mặc định',
      render: (r) => (
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-help text-xs text-[var(--text-secondary)] underline decoration-dotted" />}>
            {DEFAULT_MODE_LABEL[r.defaultMode] ?? r.defaultMode}
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono">{r.defaultMode}</span> — áp dụng cho người dùng chưa tự chọn
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'mandatory',
      label: 'Bắt buộc',
      render: (r) =>
        r.mandatory ? (
          <Tooltip>
            <TooltipTrigger render={<Badge variant="outline" className="border-[var(--solar)]/30 text-[9px] text-[var(--solar)]" />}>
              <Lock />
              bắt buộc
            </TooltipTrigger>
            <TooltipContent>Người dùng không tắt được chủ đề này</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    { key: 'updatedAt', label: 'Cập nhật', mono: true, render: (r) => fmtIso(r.updatedAt) },
    {
      key: 'id',
      label: 'Thao tác',
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
                    aria-label={`Thao tác cho ${r.key}`}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 bg-popover border border-border shadow-md">
                {next && Icon && (
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
                      <Icon className="size-3.5 mr-1.5" /> {next.label}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-xs cursor-pointer"
                  onClick={() => {
                    void navigator.clipboard.writeText(r.key)
                    toast.success(`Đã sao chép mã chủ đề "${r.key}"`)
                  }}
                >
                  <Copy className="size-3.5 mr-1.5" /> Sao chép mã chủ đề
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
      title="Chủ đề"
      subtitle={`Chủ đề mà ${app.name} được phép gửi. App gọi API bằng mã chủ đề; người dùng bật/tắt nhận thư theo chủ đề.`}
      actions={
        <Button className="gap-1.5 text-xs" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" />
          Thêm chủ đề
        </Button>
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
            title="Không đọc được danh sách chủ đề"
            description={loadError}
            action={
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                Thử lại
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
          <AlertTitle>Thao tác không thành công</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <DataTable<Row>
        rows={(rows ?? []) as Row[]}
        columns={columns}
        filterKey="status"
        searchPlaceholder="Tìm theo mã hoặc tên chủ đề..."
        empty={
          rows === null ? (
            <EmptyState icon={RadioTower} title="Đang tải" description="Đang đọc danh sách chủ đề từ API." />
          ) : (
            <EmptyState
              icon={RadioTower}
              title="Chưa có chủ đề"
              description={`${app.name} chưa có chủ đề nào. Tạo chủ đề đầu tiên để app bắt đầu gửi được.`}
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
        title="Tạm dừng chủ đề"
        description="App sẽ không gửi được thư trên chủ đề này cho tới khi kích hoạt lại. Lựa chọn bật/tắt của người dùng được giữ nguyên."
        facts={
          suspending
            ? [
                ['Chủ đề', suspending.key],
                ['App', app.namespace],
                ['Trạng thái sau khi dừng', 'suspended'],
              ]
            : undefined
        }
        confirmLabel={pending ? 'Đang dừng…' : 'Tạm dừng chủ đề'}
        confirmDisabled={pending}
        onConfirm={() => suspending && handleTransition(suspending, 'suspend')}
        onCancel={() => setSuspending(null)}
      />
    </div>
  )
}
