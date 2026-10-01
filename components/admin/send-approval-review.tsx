'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendApprovals } from '@/lib/mock-data'

const REVIEWER = 'lan.nguyen'

/** UC-008 §F — reviewer: đúng bản preview sẽ gửi, 3 con số, Duyệt / Từ chối (bắt buộc lý do). */
export function SendApprovalReview({ id }: { id: string }) {
  const t = useTranslations('sendApprovals')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const req = sendApprovals.find((r) => r.id === id) ?? sendApprovals[0]
  const [decision, setDecision] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const status = decision === 'pending' ? 'pending_approval' : decision === 'approved' ? 'queued' : 'cancelled'
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reviewTitle')}
        subtitle={req.id}
        actions={<StatusPill status={status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel className="p-5">
          <h2 className="font-heading text-xl">{req.topic_key}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t.rich('byline', { author: req.author, template: req.template, mono })}
          </p>
          {/* 3 con số — cùng hình dạng với hộp xác nhận ở Composer (UC-008 BR-5) */}
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {(
              [
                [t('colTopic'), req.topic_key],
                [t('factRecipients'), t('recipientsValue', { count: req.estimate })],
                [t('colTemplate'), req.template],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[var(--orbit)] p-4">
                <dt className="text-xs text-[var(--text-muted)]">{k}</dt>
                <dd className="mt-2 font-mono text-sm tabular-nums text-[var(--text-primary)]">{v}</dd>
              </div>
            ))}
          </dl>
          {/* Bản render đúng như sẽ gửi — khung email token --mail-* */}
          <div className="mt-6 rounded-xl bg-[var(--mail-bg)] p-6 text-[var(--mail-text)]">
            <p className="border-b border-[var(--mail-line)] pb-3 text-xs text-[var(--mail-muted)]">EWS Notification Service</p>
            <h3 className="py-5 text-xl font-bold">VM vượt ngưỡng</h3>
            <p>Máy ảo vm-alpha đang sử dụng 82% tài nguyên.</p>
            <p className="mt-8 border-t border-[var(--mail-line)] pt-3 text-xs text-[var(--mail-muted)]">Chữ ký tổ chức · Opt-out</p>
          </div>
        </Panel>
        <Panel className="h-fit p-5 lg:sticky lg:top-6">
          <h2 className="font-heading text-lg">{t('decision')}</h2>
          {decision === 'pending' ? (
            <div className="mt-5 flex flex-col gap-3">
              <Button onClick={() => setDecision('approved')}>{t('approve')}</Button>
              <Button variant="destructive" onClick={() => setOpen(true)}>
                {t('reject')}
              </Button>
              <p className="text-xs text-[var(--text-muted)]">
                {t.rich('auditNote', { author: req.author, reviewer: REVIEWER, mono })}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-[var(--starlight)]/20 p-3 text-sm">
              {t.rich(decision === 'approved' ? 'approvedBy' : 'rejectedBy', { author: req.author, reviewer: REVIEWER, mono })}
              {decision === 'rejected' && <p className="mt-2 text-[var(--supernova)]">{t('reasonValue', { reason })}</p>}
            </div>
          )}
        </Panel>
      </div>
      <ConfirmDialog
        open={open}
        tone="blocking"
        title={t('rejectTitle')}
        description={t('rejectBody')}
        confirmLabel={t('reject')}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          if (!reason.trim()) return
          setDecision('rejected')
          setOpen(false)
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="reject-reason">{t('reason')}</Label>
          <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
      </ConfirmDialog>
    </div>
  )
}
