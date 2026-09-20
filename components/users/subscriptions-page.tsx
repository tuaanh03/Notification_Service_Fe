'use client'
import { useMemo, useState } from 'react'
import { Rss } from 'lucide-react'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { SourceBadge } from '@/components/source-badge'
import { StatusPill } from '@/components/status-pill'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { maskValue, subscriptions, userById, type Subscription } from '@/lib/mock-data'

type Row = Subscription & Record<string, unknown> & { user: string }
const columns: Column<Row>[] = [
  { key: 'user', label: 'User', render: (s) => <span className="font-mono text-xs">{s.user}</span> },
  { key: 'channel', label: 'Kênh', mono: true },
  { key: 'value', label: 'Giá trị', mono: true, render: (s) => maskValue(s.channel, s.value) },
  { key: 'status', label: 'Trạng thái', render: (s) => <StatusPill status={s.status} /> },
  { key: 'source', label: 'Nguồn', render: (s) => <SourceBadge source={s.source} /> },
  { key: 'app', label: 'App', mono: true },
  { key: 'last_used', label: 'Lần dùng cuối', mono: true, render: (s) => s.last_used ?? '—' },
  { key: 'error', label: 'Lý do lỗi', mono: true, render: (s) => <span className="text-[var(--solar)]">{s.error ?? '—'}</span> },
]

/** UC-002 §D — góc nhìn điểm nhận. */
export function SubscriptionsPage() {
  const [channel, setChannel] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const rows = useMemo<Row[]>(() => subscriptions.map((s) => ({ ...s, user: userById(s.user_id)?.id ?? s.user_id })), [])
  const filtered = rows.filter((s) => (!channel || s.channel === channel) && (!status || s.status === status) && (!source || s.source === source))

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Subscription = một điểm nhận cụ thể. Đây mới là nơi tin đến." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {(
          [
            ['Kênh', channel, setChannel, ['email', 'sms', 'web_push', 'mobile_push', 'in_app']],
            ['Trạng thái', status, setStatus, ['active', 'unsubscribed', 'invalid']],
            ['Nguồn', source, setSource, ['directory', 'import', 'self']],
          ] as const
        ).map(([label, value, set, opts]) => (
          <div key={label} className="space-y-1">
            <Label htmlFor={`sf-${label}`} className="text-xs">
              {label}
            </Label>
            <NativeSelect id={`sf-${label}`} value={value} onChange={(e) => set(e.target.value)} className="font-mono">
              <NativeSelectOption value="">tất cả</NativeSelectOption>
              {opts.map((o) => (
                <NativeSelectOption key={o} value={o}>
                  {o}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ))}
        <span className="pb-2 font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {filtered.length}/{rows.length} điểm nhận
        </span>
      </div>
      <DataTable<Row> columns={columns} rows={filtered} empty={<EmptyState icon={Rss} title="Không có subscription khớp bộ lọc" description="Nới bộ lọc kênh / trạng thái / nguồn." />} />
    </>
  )
}
