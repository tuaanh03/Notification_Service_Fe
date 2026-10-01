'use client'
import { useState } from 'react'
import { AppLink } from '@/components/app-link'
import { Ban, Copy, Download, FilePlus2, History, Square } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { AuditTrail } from '@/components/audit-trail'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { LifecycleTimeline } from '@/components/lifecycle-timeline'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { flagsOf, mailLeft, notificationAudit, notificationById, notificationCounters } from '@/lib/mock-data'
import { fmtDateTime } from '@/lib/time'
import { ContentPanel } from './content-panel'
import { CountersRow } from './counters-row'
import { FlagBadge, OriginBadge } from './origin-badge'
import { PayloadPanel } from './payload-panel'
import { RecipientsTabs } from './recipients-tabs'

/** 07 §B — hero là state machine; mọi số từ notificationCounters(); hành động theo SM-3. */
export function NotificationDetail({ id }: { id: string }) {
  const t = useTranslations('detail')
  const n = notificationById(id)
  const [confirm, setConfirm] = useState<'cancel' | 'stop' | null>(null)
  if (!n)
    return (
      <>
        <PageHeader title={t('title')} />
        <EmptyState
          icon={History}
          title={t('notFoundTitle')}
          description={t('notFoundBody', { id })}
          action={
            <Button variant="outline" render={<AppLink href="/notifications" />}>
              {t('backToHistory')}
            </Button>
          }
        />
      </>
    )
  const c = notificationCounters(n)
  const left = mailLeft(n.status)
  return (
    <>
      <PageHeader
        title={n.id}
        subtitle={`${n.topic_key} · ${fmtDateTime(n.created_at)}`}
        actions={
          <>
            <OriginBadge origin={n.origin} />
            {flagsOf(n).map((f) => (
              <FlagBadge key={f.flag} label={f.label} />
            ))}
          </>
        }
      />
      <div className="min-w-0 space-y-5">
        {/* B1 */}
        <Panel glow ring className="min-w-0 overflow-hidden p-5">
          <h2 className="font-heading text-lg font-semibold">{t('lifecycle')}</h2>
          <div className="mt-3">
            <LifecycleTimeline notification={n} />
          </div>
        </Panel>
        {/* B2 */}
        <CountersRow notification={n} />
        {/* B7 — Huỷ chỉ khi queued, Dừng gửi chỉ khi sending (SM-3); Gửi thư đính chính chỉ khi thư đã ra */}
        <Panel className="flex flex-wrap items-center gap-2 p-4" data-testid="actions">
          {n.status === 'queued' && (
            <Button variant="destructive" onClick={() => setConfirm('cancel')}>
              <Ban /> {t('cancel')}
            </Button>
          )}
          {n.status === 'sending' && (
            <Button variant="destructive" onClick={() => setConfirm('stop')}>
              <Square /> {t('stop')}
            </Button>
          )}
          <Button variant="outline" render={<AppLink href="/compose" />}>
            <Copy /> {t('duplicate')}
          </Button>
          {left !== 'Chưa' && (
            <Button variant="outline" render={<AppLink href="/compose" />}>
              <FilePlus2 /> {t('correction')}
            </Button>
          )}
          <Button variant="outline" onClick={() => toast.success(t('exportingCsv'), { description: t('exportingCsvBody', { id: n.id, count: c.resolved }) })}>
            <Download /> {t('downloadCsv')}
          </Button>
          {left === 'Chưa' && (
            <span className="ml-auto text-xs text-[var(--text-muted)]">{t('nothingToCorrect')}</span>
          )}
        </Panel>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0 space-y-5">
            {/* B3 */}
            <Panel className="p-5">
              <h2 className="font-heading text-lg font-semibold">{t('recipients')}</h2>
              <div className="mt-3">
                <RecipientsTabs notification={n} />
              </div>
            </Panel>
            {/* B5 — chỉ đường API */}
            {n.origin === 'api' && (
              <Panel className="p-5">
                <h2 className="font-heading text-lg font-semibold">{t('payload')}</h2>
                <div className="mt-3">
                  <PayloadPanel notification={n} />
                </div>
              </Panel>
            )}
          </div>
          <div className="min-w-0 space-y-5">
            {/* B4 */}
            <Panel className="p-5">
              <h2 className="font-heading text-lg font-semibold">{t('content')}</h2>
              <div className="mt-3">
                <ContentPanel notification={n} />
              </div>
            </Panel>
            {/* B6 */}
            <Panel className="p-5">
              <h2 className="font-heading text-lg font-semibold">{t('audit')}</h2>
              {n.approved_by && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]" data-testid="both-names">
                  {t.rich('byline', {
                    sender: n.sender ?? '',
                    approver: n.approved_by ?? '',
                    b: (chunks) => <span className="text-[var(--text-primary)]">{chunks}</span>,
                  })}
                </p>
              )}
              <div className="mt-4">
                <AuditTrail entries={notificationAudit(n)} />
              </div>
            </Panel>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirm === 'cancel'}
        tone="warning"
        title={t('cancelTitle')}
        description={t('cancelBody')}
        facts={[
          ['topic', n.topic_key],
          [t('factRecipients'), `${c.resolved}`],
          ['template', n.template ?? '—'],
        ]}
        confirmLabel={t('cancelConfirm')}
        onConfirm={() => {
          setConfirm(null)
          toast.success(t('cancelled'), { description: t('cancelledBody', { id: n.id }) })
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'stop'}
        tone="blocking"
        title={t('stopTitle')}
        description={t('stopBody', { sent: c.sent, total: c.resolved })}
        facts={[
          [t('factSent'), `${c.sent}`],
          [t('factWillStop'), `${c.resolved - c.sent - c.optedOut - c.noChannel}`],
          ['template', n.template ?? '—'],
        ]}
        confirmLabel={t('stop')}
        onConfirm={() => {
          setConfirm(null)
          toast.success(t('stopped'), { description: t('stoppedBody', { id: n.id }) })
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
