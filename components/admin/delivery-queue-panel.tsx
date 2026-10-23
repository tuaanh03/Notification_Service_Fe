'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Inbox, RefreshCw } from 'lucide-react'
import { AppLink } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { InfoHint } from '@/components/info-hint'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import type { DeliveryQueueDto } from '@/lib/api/types'
import { cosmicTokens } from '@/lib/theme'
import { fmtDateTime } from '@/lib/time'

type Row = DeliveryQueueDto['apps'][number] & Record<string, unknown>

/** Hộp gửi dùng tới mức này thì thanh chuyển màu cảnh báo — còn ít lượt, thư thường sắp bị dời sang ngày sau. */
const WARN_RATIO = 0.8

/**
 * `/admin/queue` — Hàng chờ gửi (ADR-0041 của backend). Ba thẻ: hộp gửi chung hôm nay (lượt đã dùng / trần ngày), thư đang
 * chờ (kèm thời gian chờ ước tính), thư hẹn giờ; bảng app đang có thư chưa xong, nhiều nhất trước. Ngưỡng chỉnh ở Cài đặt
 * hệ thống; số lần gọi API / trần mỗi giờ của từng app chỉnh ở Giới hạn gửi của app đó.
 */
export function DeliveryQueuePanel({ queue }: { queue: DeliveryQueueDto }) {
  const t = useTranslations('deliveryQueue')
  const format = useFormatter()
  const num = (n: number) => format.number(n)
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()

  const { mailbox } = queue
  const ratio = mailbox.dailyCap > 0 ? Math.min(1, mailbox.usedToday / mailbox.dailyCap) : 0
  const left = Math.max(0, mailbox.dailyCap - mailbox.usedToday)

  const columns: Column<Row>[] = [
    {
      key: 'name',
      label: t('colApp'),
      render: (r) => (
        <AppLink href="/settings/limits" app={r.appId} className="hover:underline">
          <span className="font-medium">{r.name || t('unknownApp')}</span>
          {r.slug && <span className="ml-2 font-mono text-xs text-[var(--text-muted)]">{r.slug}</span>}
        </AppLink>
      ),
    },
    { key: 'queued', label: t('colWaiting'), numeric: true, render: (r) => num(r.queued + r.sending) },
    { key: 'scheduled', label: t('colScheduled'), numeric: true, render: (r) => num(r.scheduled) },
    {
      key: 'sending',
      label: t('colUsage'),
      numeric: true,
      hideBelow: 'sm',
      render: (r) => t('ofMax', { count: num(r.queued + r.sending + r.scheduled), max: num(queue.maxPendingPerApp) }),
    },
    {
      key: 'oldestQueuedAt',
      label: t('colOldest'),
      hideBelow: 'lg',
      render: (r) => (r.oldestQueuedAt ? <span className="tabular-nums">{fmtDateTime(r.oldestQueuedAt)}</span> : '—'),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button variant="outline" size="sm" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            <RefreshCw className={refreshing ? 'animate-spin' : undefined} /> {t('refresh')}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="p-5" data-testid="queue-mailbox">
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-semibold">{t('mailboxTitle')}</h2>
            <InfoHint label={t('mailboxTitle')} summary={t('mailboxInfo')} />
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {num(mailbox.usedToday)}
            <span className="ml-1.5 text-sm font-normal text-[var(--text-muted)]">/ {num(mailbox.dailyCap)}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span
              className="block h-full"
              style={{ width: `${ratio * 100}%`, background: ratio >= WARN_RATIO ? cosmicTokens.solar : cosmicTokens.starlight }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{t('mailboxLeft', { count: num(left) })}</p>
        </Panel>

        <Panel className="p-5" data-testid="queue-waiting">
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-semibold">{t('waitingTitle')}</h2>
            <InfoHint label={t('waitingTitle')} summary={t('waitingInfo')} />
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{num(queue.waiting)}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {queue.waiting > 0 ? t('waitHint', { minutes: num(queue.estimatedWaitMinutes) }) : t('waitNone')}
          </p>
        </Panel>

        <Panel className="p-5" data-testid="queue-scheduled">
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-semibold">{t('scheduledTitle')}</h2>
            <InfoHint label={t('scheduledTitle')} summary={t('scheduledInfo')} />
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{num(queue.scheduled)}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {t('speedHint', { perMinute: num(mailbox.perMinute), reserve: num(mailbox.priorityReservePerMinute) })}
          </p>
        </Panel>
      </div>

      <div className="mt-6" data-testid="queue-apps">
        <div className="mb-3 flex items-center gap-1">
          <h2 className="text-sm font-semibold">{t('appsTitle')}</h2>
          <InfoHint label={t('appsTitle')} summary={t('appsInfo')} />
        </div>
        <DataTable
          columns={columns}
          rows={queue.apps as Row[]}
          hideSearch
          empty={<EmptyState icon={Inbox} title={t('emptyTitle')} description={t('emptyBody')} />}
        />
      </div>

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        {t.rich('settingsNote', {
          link: (chunks) => (
            <AppLink href="/admin/settings" className="underline">
              {chunks}
            </AppLink>
          ),
        })}
      </p>
    </>
  )
}
