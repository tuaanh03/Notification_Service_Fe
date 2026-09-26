'use client'
import { useState } from 'react'
import { AppLink } from '@/components/app-link'
import { Ban, Copy, Download, FilePlus2, History, Square } from 'lucide-react'
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
  const n = notificationById(id)
  const [confirm, setConfirm] = useState<'cancel' | 'stop' | null>(null)
  if (!n)
    return (
      <>
        <PageHeader title="Chi tiết lần gửi" />
        <EmptyState icon={History} title="Không tìm thấy lần gửi" description={`Không có bản ghi ${id}.`} action={<Button variant="outline" render={<AppLink href="/notifications" />}>Về Lịch sử gửi</Button>} />
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
          <h2 className="font-heading text-lg font-semibold">Vòng đời</h2>
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
              <Ban /> Huỷ
            </Button>
          )}
          {n.status === 'sending' && (
            <Button variant="destructive" onClick={() => setConfirm('stop')}>
              <Square /> Dừng gửi
            </Button>
          )}
          <Button variant="outline" render={<AppLink href="/compose" />}>
            <Copy /> Nhân bản
          </Button>
          {left !== 'Chưa' && (
            <Button variant="outline" render={<AppLink href="/compose" />}>
              <FilePlus2 /> Gửi thư đính chính
            </Button>
          )}
          <Button variant="outline" onClick={() => toast.success('Đang xuất CSV', { description: `${n.id} · ${c.resolved} dòng snapshot` })}>
            <Download /> Tải báo cáo CSV
          </Button>
          {left === 'Chưa' && (
            <span className="ml-auto text-xs text-[var(--text-muted)]">Chưa có thư nào ra — không có gì để đính chính.</span>
          )}
        </Panel>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0 space-y-5">
            {/* B3 */}
            <Panel className="p-5">
              <h2 className="font-heading text-lg font-semibold">Người nhận</h2>
              <div className="mt-3">
                <RecipientsTabs notification={n} />
              </div>
            </Panel>
            {/* B5 — chỉ đường API */}
            {n.origin === 'api' && (
              <Panel className="p-5">
                <h2 className="font-heading text-lg font-semibold">Payload &amp; phản hồi</h2>
                <div className="mt-3">
                  <PayloadPanel notification={n} />
                </div>
              </Panel>
            )}
          </div>
          <div className="min-w-0 space-y-5">
            {/* B4 */}
            <Panel className="p-5">
              <h2 className="font-heading text-lg font-semibold">Nội dung đã gửi</h2>
              <div className="mt-3">
                <ContentPanel notification={n} />
              </div>
            </Panel>
            {/* B6 */}
            <Panel className="p-5">
              <h2 className="font-heading text-lg font-semibold">Audit</h2>
              {n.approved_by && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]" data-testid="both-names">
                  Soạn bởi <span className="text-[var(--text-primary)]">{n.sender}</span> · Duyệt bởi{' '}
                  <span className="text-[var(--text-primary)]">{n.approved_by}</span>
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
        title="Huỷ lần gửi?"
        description="Chưa có thư nào rời hệ thống. Huỷ được sạch."
        facts={[
          ['topic', n.topic_key],
          ['người nhận', `${c.resolved}`],
          ['template', n.template ?? '—'],
        ]}
        confirmLabel="Huỷ lần gửi"
        onConfirm={() => {
          setConfirm(null)
          toast.success('Đã huỷ', { description: `${n.id} → cancelled. Không ai nhận gì.` })
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'stop'}
        tone="blocking"
        title="Dừng phần chưa gửi?"
        description={`Đã gửi ${c.sent}/${c.resolved}. Từ đây không thu hồi được phần đã ra — chỉ dừng phần còn lại.`}
        facts={[
          ['đã ra', `${c.sent}`],
          ['sẽ dừng', `${c.resolved - c.sent - c.optedOut - c.noChannel}`],
          ['template', n.template ?? '—'],
        ]}
        confirmLabel="Dừng gửi"
        onConfirm={() => {
          setConfirm(null)
          toast.success('Đã dừng', { description: `${n.id} → stopped.` })
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
