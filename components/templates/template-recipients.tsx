'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, PlugZap, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadTemplateRecipientsAction } from '@/app/templates/stats-actions'
import { useApp } from '@/components/app-context'
import { AppLink } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Panel } from '@/components/panel'
import { StatusTabs, type StatusTab } from '@/components/status-tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { tOr } from '@/i18n/dynamic'
import type { RecipientBucket, TemplateStatsDays } from '@/lib/api/template-stats'
import type { TemplateRecipientDto, TemplateStatsDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

const PAGE_SIZE = 25
type Row = TemplateRecipientDto & Record<string, unknown>

/**
 * Người nhận của template theo tab (UX-24, kiểu "Audience activity" của OneSignal — không khoá tab nào).
 * Tab "đã mở / chưa mở" chỉ hiện khi khoảng đang xem có thư được theo dõi. Bấm mã người nhận -> Lịch sử gửi của người đó.
 */
export function TemplateRecipients({
  templateId,
  days,
  version,
  stats,
}: {
  templateId: string
  days: TemplateStatsDays
  version: number | undefined
  stats: TemplateStatsDto
}) {
  const t = useTranslations('templateStats')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const tx = useTranslations('exclusion')
  const { app } = useApp()
  const appId = app.app_id

  const [bucket, setBucket] = useState<RecipientBucket>('sent')
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<TemplateRecipientDto[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Đổi khoảng / version là đổi cả tập người nhận — về trang đầu (so trong lúc render như màn Lịch sử gửi).
  const filterKey = `${days}:${version ?? ''}`
  const [lastKey, setLastKey] = useState(filterKey)
  if (lastKey !== filterKey) {
    setLastKey(filterKey)
    setOffset(0)
    setBucket('sent')
  }

  const load = useCallback(async () => {
    const result = await loadTemplateRecipientsAction(appId, templateId, {
      days,
      version,
      bucket,
      q: q || undefined,
      limit: PAGE_SIZE,
      offset,
    })
    if (result.ok) {
      setRows(result.data.rows)
      setTotal(result.data.total)
      setError(null)
    } else {
      setRows([])
      setError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, templateId, days, version, bucket, q, offset, te])

  useEffect(() => {
    startTransition(load)
  }, [load])

  const tracked = stats.opens.tracked > 0
  const tabs: StatusTab[] = [
    { value: 'sent', label: t('bucketSent'), count: stats.buckets.sent },
    ...(tracked
      ? [
          { value: 'opened', label: t('bucketOpened'), count: stats.buckets.opened },
          { value: 'unopened', label: t('bucketUnopened'), count: stats.buckets.unopened },
        ]
      : []),
    { value: 'failed', label: t('bucketFailed'), count: stats.buckets.failed },
    { value: 'skipped', label: t('bucketSkipped'), count: stats.buckets.skipped },
  ]

  const columns: Column<Row>[] = [
    {
      key: 'address',
      label: t('colRecipient'),
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate">{r.address}</div>
          {r.externalId && (
            <AppLink
              href={`/notifications?externalId=${encodeURIComponent(r.externalId)}`}
              className="font-mono text-xs text-[var(--starlight)] underline-offset-2 hover:underline"
              title={t('historyOf', { id: r.externalId })}
            >
              {r.externalId}
            </AppLink>
          )}
        </div>
      ),
    },
    { key: 'topicKey', label: t('colTopic'), mono: true, hideBelow: 'lg', render: (r) => r.topicKey ?? '—' },
    { key: 'version', label: t('colVersion'), hideBelow: 'sm', render: (r) => (r.version === null ? '—' : `v${r.version}`) },
    { key: 'createdAt', label: t('colSentAt'), hideBelow: 'sm', render: (r) => <span className="tabular-nums">{fmtDateTime(r.sentAt ?? r.createdAt)}</span> },
    ...(bucket === 'failed' || bucket === 'skipped'
      ? [
          {
            key: 'exclusionReason' as const,
            label: t('colReason'),
            render: (r: Row) =>
              r.status === 'skipped' ? (
                tOr(tx, r.exclusionReason ?? '', t('reasonUnknown'))
              ) : (
                <span title={r.error ?? undefined}>{t('reasonFailed')}</span>
              ),
          },
        ]
      : [
          {
            key: 'firstOpenedAt' as const,
            label: t('colFirstOpened'),
            hideBelow: 'lg' as const,
            render: (r: Row) => (
              <span className="tabular-nums">{r.firstOpenedAt ? fmtDateTime(r.firstOpenedAt) : r.openTracked ? t('notOpened') : t('notTracked')}</span>
            ),
          },
          { key: 'openCount' as const, label: t('colOpens'), numeric: true, hideBelow: 'sm' as const, render: (r: Row) => (r.openTracked ? r.openCount : '—') },
        ]),
  ]

  const to = Math.min(offset + PAGE_SIZE, total)
  const search = () => {
    setOffset(0)
    setQ(draft.trim())
  }

  return (
    <section className="space-y-3" data-testid="stats-recipients" aria-labelledby="stats-recipients-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="stats-recipients-title" className="text-sm font-semibold">{t('recipientsTitle')}</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('recipientsSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Input
            aria-label={t('searchLabel')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search()
            }}
            placeholder={t('searchPlaceholder')}
            className="w-56"
          />
          <Button variant="outline" size="sm" disabled={pending} onClick={search}>
            {tc('search')}
          </Button>
        </div>
      </div>

      <StatusTabs
        value={bucket}
        onChange={(next) => {
          setOffset(0)
          setBucket(next as RecipientBucket)
        }}
        tabs={tabs}
        label={t('recipientsTitle')}
      />

      {error ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={tc('loadErrorTitle')} description={error} />
        </Panel>
      ) : (
        <DataTable<Row>
          hideSearch
          columns={columns}
          rows={rows as Row[]}
          empty={<EmptyState icon={Users} title={q ? t('emptySearch', { q }) : t('emptyBucket')} description={t('emptyBucketBody')} />}
        />
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span className="tabular-nums">
            {offset + 1}–{to} / {total}
          </span>
          <span className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0 || pending} onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}>
              <ChevronLeft /> {tc('prev')}
            </Button>
            <Button variant="outline" size="sm" disabled={to >= total || pending} onClick={() => setOffset((v) => v + PAGE_SIZE)}>
              {tc('next')} <ChevronRight data-icon="inline-end" />
            </Button>
          </span>
        </div>
      )}
    </section>
  )
}
