'use client'
import { useMemo, useState } from 'react'
import { Rss } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { SourceBadge } from '@/components/source-badge'
import { StatusPill } from '@/components/status-pill'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { maskValue, subscriptions, userById, type Subscription } from '@/lib/mock-data'

type Row = Subscription & Record<string, unknown> & { user: string }
/** Cột của bảng — trong hook vì nhãn theo ngôn ngữ đang chọn. */
function useColumns(): Column<Row>[] {
  const t = useTranslations('subscriptions')
  return [
  { key: 'user', label: t('colUser'), render: (s) => <span className="font-mono text-xs">{s.user}</span> },
  { key: 'channel', label: t('colChannel'), mono: true },
  { key: 'value', label: t('colValue'), mono: true, render: (s) => maskValue(s.channel, s.value) },
  { key: 'status', label: t('colStatus'), render: (s) => <StatusPill status={s.status} /> },
  { key: 'source', label: t('colSource'), render: (s) => <SourceBadge source={s.source} /> },
  { key: 'app', label: t('colApp'), mono: true },
  { key: 'last_used', label: t('colLastUsed'), mono: true, render: (s) => s.last_used ?? '—' },
  { key: 'error', label: t('colError'), mono: true, render: (s) => <span className="text-[var(--solar)]">{s.error ?? '—'}</span> },
]
}

/** UC-002 §D — góc nhìn điểm nhận. */
export function SubscriptionsPage() {
  const t = useTranslations('subscriptions')
  const columns = useColumns()
  const [channel, setChannel] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const rows = useMemo<Row[]>(() => subscriptions.map((s) => ({ ...s, user: userById(s.user_id)?.id ?? s.user_id })), [])
  const filtered = rows.filter((s) => (!channel || s.channel === channel) && (!status || s.status === status) && (!source || s.source === source))

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {(
          [
            ['channel', t('colChannel'), channel, setChannel, ['email', 'sms', 'web_push', 'mobile_push', 'in_app']],
            ['status', t('colStatus'), status, setStatus, ['active', 'unsubscribed', 'invalid']],
            ['source', t('colSource'), source, setSource, ['directory', 'import', 'self']],
          ] as const
        ).map(([id, label, value, set, opts]) => (
          <div key={id} className="space-y-1">
            <Label htmlFor={`sf-${id}`} className="text-xs">
              {label}
            </Label>
            <NativeSelect id={`sf-${id}`} value={value} onChange={(e) => set(e.target.value)} className="font-mono">
              <NativeSelectOption value="">{t('all')}</NativeSelectOption>
              {opts.map((o) => (
                <NativeSelectOption key={o} value={o}>
                  {o}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ))}
        <span className="pb-2 font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {t('count', { shown: filtered.length, total: rows.length })}
        </span>
      </div>
      <DataTable<Row> columns={columns} rows={filtered} empty={<EmptyState icon={Rss} title={t('emptyTitle')} description={t('emptyBody')} />} />
    </>
  )
}
