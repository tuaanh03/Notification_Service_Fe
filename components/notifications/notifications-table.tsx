'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { History } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { flagsOf, fmtIso, notificationCounters, notifications, topics, type Notification } from '@/lib/mock-data'
import { notificationStatuses, statusColors } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { FlagBadge, OriginBadge } from './origin-badge'

type Row = Notification & Record<string, unknown> & { resolved: number; sent: number; bounce: number; deducted: number }
const ERROR_STATUSES = ['failed', 'partially_failed', 'stopped']

const columns: Column<Row>[] = [
  {
    key: 'id',
    label: 'notification_id',
    mono: true,
    render: (n) => (
      <Button
        variant="link"
        size="xs"
        className="h-auto px-0 font-mono text-[var(--starlight)]"
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard?.writeText(n.id)
          toast.success('Đã sao chép', { description: n.id })
        }}
        title={n.id}
      >
        {n.id.length > 12 ? `${n.id.slice(0, 12)}…` : n.id}
      </Button>
    ),
  },
  { key: 'created_at', label: 'Thời điểm', mono: true, render: (n) => fmtIso(n.created_at) },
  { key: 'topic_key', label: 'Topic', mono: true },
  { key: 'origin', label: 'Origin', render: (n) => <OriginBadge origin={n.origin} /> },
  // UC-005 §A: api → app_id mono, dashboard → tên thật — bất đối xứng có chủ đích
  {
    key: 'sender',
    label: 'Người gửi',
    render: (n) => (n.origin === 'api' ? <span className="font-mono text-xs">{n.sender}</span> : <span>{n.sender}</span>),
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (n) =>
      n.status === 'no_recipient' ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <StatusPill status={n.status} />
          </TooltipTrigger>
          <TooltipContent>Giải ra 0 người nhận. Không phải lỗi ở đường API.</TooltipContent>
        </Tooltip>
      ) : (
        <StatusPill status={n.status} />
      ),
  },
  { key: 'resolved', label: 'Giải ra', numeric: true },
  { key: 'sent', label: 'Đã gửi', numeric: true },
  { key: 'bounce', label: 'Bounce', numeric: true },
  { key: 'deducted', label: 'Bị trừ', numeric: true },
  { key: 'template', label: 'Template', mono: true, render: (n) => n.template ?? '—' },
  {
    key: 'flags',
    label: 'Cờ',
    render: (n) => (
      <span className="flex flex-wrap gap-1">
        {flagsOf(n).map((f) => (
          <FlagBadge key={f.flag} label={f.label} />
        ))}
      </span>
    ),
  },
]

/** UC-005 §A — một bảng cho cả api lẫn dashboard; status strip 11 chip; no_recipient slate dashed, không đỏ. */
export function NotificationsTable() {
  const router = useRouter()
  const [status, setStatus] = useState<string[]>([])
  const [origin, setOrigin] = useState<string[]>([])
  const [topic, setTopic] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [errorsOnly, setErrorsOnly] = useState(false)

  const rows = useMemo<Row[]>(
    () =>
      notifications.map((n) => {
        const c = notificationCounters(n)
        return { ...n, resolved: c.resolved, sent: c.sent, bounce: c.bounce, deducted: c.optedOut + c.noChannel }
      }),
    [],
  )
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const n of rows) m[n.status] = (m[n.status] ?? 0) + 1
    return m
  }, [rows])
  const filtered = rows.filter(
    (n) =>
      (status.length === 0 || status.includes(n.status)) &&
      (origin.length === 0 || origin.includes(n.origin)) &&
      (!topic || n.topic_key === topic) &&
      (!from || n.created_at.slice(0, 10) >= from) &&
      (!to || n.created_at.slice(0, 10) <= to) &&
      (!errorsOnly || ERROR_STATUSES.includes(n.status)),
  )

  return (
    <div className="space-y-4">
      {/* status strip: 11 trạng thái, bấm để lọc (multi) */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo trạng thái" data-testid="status-strip">
        {notificationStatuses.map((s) => {
          const on = status.includes(s)
          return (
            <Button
              key={s}
              variant="outline"
              size="xs"
              aria-pressed={on}
              className={cn('font-mono', on && 'border-current')}
              style={on ? { color: statusColors[s] } : undefined}
              onClick={() => setStatus((prev) => (on ? prev.filter((x) => x !== s) : [...prev, s]))}
            >
              {s} <span className="tabular-nums text-[var(--text-muted)]">{counts[s] ?? 0}</span>
            </Button>
          )
        })}
        {status.length > 0 && (
          <Button variant="ghost" size="xs" onClick={() => setStatus([])}>
            Bỏ lọc
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <ToggleGroup multiple variant="outline" size="sm" value={origin} onValueChange={(v) => setOrigin(v as string[])} aria-label="Origin">
          <ToggleGroupItem value="api" className="font-mono">
            api
          </ToggleGroupItem>
          <ToggleGroupItem value="dashboard" className="font-mono">
            dashboard
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="space-y-1">
          <Label htmlFor="ntf-topic" className="text-xs">
            Topic
          </Label>
          <NativeSelect id="ntf-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="font-mono">
            <NativeSelectOption value="">Tất cả topic</NativeSelectOption>
            {topics.map((t) => (
              <NativeSelectOption key={t.topic_key} value={t.topic_key}>
                {t.topic_key}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ntf-from" className="text-xs">
            Từ ngày
          </Label>
          <Input id="ntf-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ntf-to" className="text-xs">
            Đến ngày
          </Label>
          <Input id="ntf-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="font-mono" />
        </div>
        <Label className="flex items-center gap-2 pb-2 text-xs">
          <Checkbox checked={errorsOnly} onCheckedChange={(v) => setErrorsOnly(v === true)} />
          Chỉ hiện lần gửi có lỗi
        </Label>
        <span className="pb-2 font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {filtered.length}/{rows.length}
        </span>
      </div>
      <DataTable<Row>
        columns={columns}
        rows={filtered}
        onRowClick={(n) => router.push(`/notifications/${n.id}`)}
        // UC-005 BR-7: no_recipient ở đường API là bình thường — slate gạch đứt, không đỏ
        rowClassName={(n) => (n.status === 'no_recipient' ? 'border-dashed border-[var(--text-muted)]/40 text-[var(--text-muted)]' : undefined)}
        empty={<EmptyState icon={History} title="Không có lần gửi khớp bộ lọc" description="Nới bộ lọc trạng thái, origin hoặc khoảng ngày." />}
      />
    </div>
  )
}
