'use client'
import { useState } from 'react'
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
  const req = sendApprovals.find((r) => r.id === id) ?? sendApprovals[0]
  const [decision, setDecision] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const status = decision === 'pending' ? 'pending_approval' : decision === 'approved' ? 'queued' : 'cancelled'
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rà soát lần gửi"
        subtitle={req.id}
        actions={<StatusPill status={status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel className="p-5">
          <h2 className="font-heading text-xl">{req.topic_key}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Soạn bởi <span className="font-mono">{req.author}</span> · Template{' '}
            <span className="font-mono">{req.template}</span>
          </p>
          {/* 3 con số — cùng hình dạng với hộp xác nhận ở Composer (UC-008 BR-5) */}
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {(
              [
                ['Topic', req.topic_key],
                ['Người nhận', `${req.estimate} người (ước lượng)`],
                ['Template', req.template],
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
          <h2 className="font-heading text-lg">Quyết định</h2>
          {decision === 'pending' ? (
            <div className="mt-5 flex flex-col gap-3">
              <Button onClick={() => setDecision('approved')}>Duyệt</Button>
              <Button variant="destructive" onClick={() => setOpen(true)}>
                Từ chối
              </Button>
              <p className="text-xs text-[var(--text-muted)]">
                Duyệt sẽ ghi audit: Soạn bởi <span className="font-mono">{req.author}</span> · Duyệt bởi{' '}
                <span className="font-mono">{REVIEWER}</span>
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-[var(--starlight)]/20 p-3 text-sm">
              Soạn bởi <span className="font-mono">{req.author}</span> ·{' '}
              {decision === 'approved' ? 'Duyệt bởi' : 'Từ chối bởi'} <span className="font-mono">{REVIEWER}</span>
              {decision === 'rejected' && <p className="mt-2 text-[var(--supernova)]">Lý do: {reason}</p>}
            </div>
          )}
        </Panel>
      </div>
      <ConfirmDialog
        open={open}
        tone="blocking"
        title="Từ chối lần gửi"
        description="Bắt buộc nhập lý do để người soạn có thể sửa."
        confirmLabel="Từ chối"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          if (!reason.trim()) return
          setDecision('rejected')
          setOpen(false)
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="reject-reason">Lý do</Label>
          <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
      </ConfirmDialog>
    </div>
  )
}
