'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, History, PlugZap, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadNotificationsAction } from '@/app/notifications/actions'
import { loadTopicsAction } from '@/app/topics/actions'
import { useApp } from '@/components/app-context'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AppLink } from '@/components/app-link'
import type { NotificationSummaryDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { NotificationOutcome, templateLabelOf, useOutcomeOf } from './notification-outcome'

type Row = NotificationSummaryDto & Record<string, unknown>

const PAGE_SIZE = 25

/**
 * Trạng thái mà đường gửi trực tiếp của MVP thật sự tạo ra (`NotificationDto.status` của backend).
 * Không liệt kê đủ 11: sáu trạng thái còn lại thuộc gửi hàng loạt / hẹn giờ / phê duyệt, chưa có —
 * lựa chọn lọc cho trạng thái không bao giờ xuất hiện chỉ làm người trực nghĩ là "đang yên".
 */
const MVP_STATUSES = ['queued', 'sending', 'sent', 'no_recipient', 'failed'] as const

/**
 * Cột của bảng — dựng trong hook vì nhãn theo ngôn ngữ đang chọn. Mã người nhận dẫn sang trang
 * chi tiết người đó — không mở ngăn chi tiết của dòng (`stopPropagation`).
 */
function useColumns(withRecipient: boolean): Column<Row>[] {
  const t = useTranslations('notifications')
  const outcomeOf = useOutcomeOf()
  const recipientColumn: Column<Row> = {
    key: 'externalId',
    label: t('colRecipient'),
    mono: true,
    render: (n) =>
      n.externalId ? (
        <AppLink
          href={`/users/${encodeURIComponent(n.externalId)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[var(--starlight)] underline-offset-2 hover:underline"
        >
          {n.externalId}
        </AppLink>
      ) : (
        <span className="text-[var(--text-muted)]">—</span>
      ),
  }
  return [
    { key: 'createdAt', label: t('colCreatedAt'), mono: true, render: (n) => fmtDateTime(n.createdAt) },
    { key: 'topic', label: t('colTopic'), mono: true, render: (n) => n.topic || '—' },
    { key: 'template', label: t('colTemplate'), render: (n) => templateLabelOf(n) },
    ...(withRecipient ? [recipientColumn] : []),
    {
      key: 'status',
      label: t('colStatus'),
      render: (n) =>
        n.status === 'no_recipient' ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <StatusPill status={n.status} />
            </TooltipTrigger>
            <TooltipContent>{t('noRecipientTip')}</TooltipContent>
          </Tooltip>
        ) : (
          <StatusPill status={n.status} />
        ),
    },
    { key: 'recipient', label: t('colOutcome'), render: (n) => <span className="text-xs">{outcomeOf(n)}</span> },
  ]
}

/**
 * UC-005 §A — Lịch sử gửi, đọc dữ liệu thật (`implementation_plan.md` §5).
 *
 * CHỈ ĐỌC. Không có Huỷ / Dừng / Gửi lại (MVP không có lệnh nào như vậy), không có địa chỉ
 * email và nội dung thư. Lọc theo mã người nhận là khớp ĐÚNG — câu hỏi luôn là "thư gửi anh A".
 *
 * `recipient` = cố định một người (trang chi tiết `/users/[id]`): không có ô gõ mã, không có cột
 * mã người nhận — cả bảng đã là của người đó.
 */
export function NotificationsTable({
  initialExternalId = '',
  recipient,
}: {
  initialExternalId?: string
  recipient?: string
}) {
  const t = useTranslations('notifications')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const { app } = useApp()
  const appId = app.app_id

  const [rows, setRows] = useState<NotificationSummaryDto[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [topic, setTopic] = useState('')
  /** Ô mã đang gõ — chỉ áp dụng khi bấm Tìm, để mỗi phím không thành một lời gọi. */
  const [draft, setDraft] = useState(initialExternalId)
  const [searched, setSearched] = useState(initialExternalId)
  const externalId = recipient ?? searched
  const [topicKeys, setTopicKeys] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<NotificationSummaryDto | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadNotificationsAction(appId, { limit: PAGE_SIZE, offset, status, topic, externalId })
    if (result.ok) {
      setRows(result.data.rows)
      setTotal(result.data.total)
      setLoadError(null)
    } else {
      setRows(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, offset, status, topic, externalId, te])

  useEffect(() => {
    startTransition(load)
  }, [load])

  // Danh sách chủ đề cho ô lọc. Lỗi ở đây không chặn màn — chỉ mất ô lọc theo chủ đề.
  useEffect(() => {
    let live = true
    loadTopicsAction(appId).then((result) => {
      if (live) setTopicKeys(result.ok ? result.data.map((t) => t.key) : [])
    })
    return () => {
      live = false
    }
  }, [appId])

  // Đổi app là đổi hẳn lịch sử — bỏ chọn, về trang đầu, xoá bộ lọc (mã người nhận không dùng chung giữa app).
  // So trong lúc render, không dùng useEffect như `/users`: effect chạy cả lần mount và sẽ xoá
  // `initialExternalId` vừa lấy từ `?externalId=`.
  const [lastAppId, setLastAppId] = useState(appId)
  if (lastAppId !== appId) {
    setLastAppId(appId)
    setSelected(null)
    setOffset(0)
    setStatus('')
    setTopic('')
    setDraft('')
    setSearched('')
  }

  const columns = useColumns(!recipient)
  const filtered = Boolean(status || topic || (!recipient && externalId))
  const clear = () => {
    setStatus('')
    setTopic('')
    setDraft('')
    setSearched('')
    setOffset(0)
  }
  const to = Math.min(offset + PAGE_SIZE, total)

  if (loadError) {
    return (
      <Panel className="overflow-hidden">
        <EmptyState icon={PlugZap} title={tc('loadErrorTitle')} description={loadError} />
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {!recipient && (
          <div className="space-y-1">
            <Label htmlFor="ntf-external" className="text-xs">
              {t('colRecipient')}
            </Label>
            <div className="flex gap-2">
              <Input
                id="ntf-external"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  setOffset(0)
                  setSearched(draft.trim())
                }}
                placeholder={t('recipientPlaceholder')}
                className="w-56 font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setOffset(0)
                  setSearched(draft.trim())
                }}
              >
                <Search /> {tc('search')}
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="ntf-status" className="text-xs">
            {t('colStatus')}
          </Label>
          <NativeSelect
            id="ntf-status"
            value={status}
            onChange={(e) => {
              setOffset(0)
              setStatus(e.target.value)
            }}
            className="font-mono"
          >
            <NativeSelectOption value="">{tc('all')}</NativeSelectOption>
            {MVP_STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {s}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ntf-topic" className="text-xs">
            {t('colTopic')}
          </Label>
          <NativeSelect
            id="ntf-topic"
            value={topic}
            onChange={(e) => {
              setOffset(0)
              setTopic(e.target.value)
            }}
            className="font-mono"
          >
            <NativeSelectOption value="">{tc('all')}</NativeSelectOption>
            {topicKeys.map((key) => (
              <NativeSelectOption key={key} value={key}>
                {key}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clear}>
            {tc('clearFilters')}
          </Button>
        )}
        <span className="ml-auto pb-2 font-mono text-xs tabular-nums text-[var(--text-muted)]">{t('count', { count: total })}</span>
      </div>

      <DataTable<Row>
        hideSearch
        columns={columns}
        rows={(rows ?? []) as Row[]}
        onRowClick={(n) => setSelected(n)}
        rowClassName={(n) => (n.id === selected?.id ? 'bg-sidebar-accent' : undefined)}
        empty={
          <EmptyState
            icon={History}
            title={filtered ? t('emptyFilteredTitle') : t('emptyTitle')}
            description={
              recipient
                ? filtered
                  ? t('emptyLoosen')
                  : t('emptyRecipient', { app: app.name, id: recipient })
                : filtered
                  ? externalId
                    ? t('emptyRecipientFiltered', { id: externalId })
                    : t('emptyLoosen')
                  : t('emptyApp', { app: app.name })
            }
          />
        }
      />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span className="font-mono tabular-nums">
            {offset + 1}–{to} / {total}
          </span>
          <span className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || pending}
              onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}
            >
              <ChevronLeft /> {tc('prev')}
            </Button>
            <Button variant="outline" size="sm" disabled={to >= total || pending} onClick={() => setOffset((v) => v + PAGE_SIZE)}>
              {tc('next')} <ChevronRight data-icon="inline-end" />
            </Button>
          </span>
        </div>
      )}

      <NotificationOutcome notification={selected} linkRecipient={!recipient} onClose={() => setSelected(null)} />
    </div>
  )
}
