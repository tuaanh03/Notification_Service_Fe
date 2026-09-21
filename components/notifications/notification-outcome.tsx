'use client'

import Link from 'next/link'
import { Info, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { NotificationSummaryDto } from '@/lib/api/types'
import { fmtIso } from '@/lib/mock-data'

/** Vì sao thư KHÔNG được gửi — chữ cho người trực, khớp `exclusion_reason` của backend. */
export const EXCLUSION_LABEL: Readonly<Record<string, string>> = {
  no_channel: 'chưa khai email',
  invalid: 'địa chỉ không dùng được (thư dội về / bị báo rác)',
  suppressed: 'người nhận đã tự ngắt email',
  opted_out_optional: 'đã tắt mọi tin không bắt buộc',
  opted_out: 'đã tắt chủ đề này',
}

/** Tiền tố backend ghi vào `error` khi không biết thư đã đi hay chưa (`OUTCOME_UNKNOWN`). */
const OUTCOME_UNKNOWN = 'outcome_unknown'

/** Một câu trả lời "thư này ra sao" — dùng chung cho cột Kết cục và panel chi tiết. */
export function outcomeOf(n: NotificationSummaryDto): string {
  const r = n.recipient
  if (!r) return n.status === 'queued' ? 'đang chờ gửi' : '—'
  if (r.exclusionReason) return `không gửi: ${EXCLUSION_LABEL[r.exclusionReason] ?? r.exclusionReason}`
  if (r.error?.startsWith(OUTCOME_UNKNOWN)) return 'không rõ đã gửi hay chưa'
  if (r.error) return 'máy chủ thư từ chối'
  if (r.status === 'sent') return 'máy chủ thư đã nhận'
  return 'đang gửi'
}

function Step({ label, at }: { label: string; at: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-1.5 last:border-b-0">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-xs tabular-nums">{at ? fmtIso(at) : '—'}</span>
    </div>
  )
}

/**
 * Chi tiết một lần gửi, mở từ dòng trong Lịch sử gửi.
 *
 * Mọi thứ ở đây đã có sẵn trong dòng danh sách — không gọi thêm API. Không hiện địa chỉ email
 * (có ở màn Người nhận) và không hiện nội dung thư (app service đã giữ nội dung đó).
 * Không có nút Huỷ / Dừng / Gửi lại: MVP không có lệnh nào như vậy.
 */
export function NotificationOutcome({ notification: n, onClose }: { notification: NotificationSummaryDto; onClose: () => void }) {
  const unknown = n.recipient?.error?.startsWith(OUTCOME_UNKNOWN) ?? false

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="font-mono">{n.topic || '—'}</span>
            <StatusPill status={n.status} />
          </h2>
          <Button
            variant="link"
            size="xs"
            className="h-auto max-w-full truncate px-0 font-mono text-[var(--text-secondary)]"
            onClick={() => {
              navigator.clipboard?.writeText(n.id)
              toast.success('Đã sao chép', { description: n.id })
            }}
          >
            {n.id}
          </Button>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Đóng" onClick={onClose}>
          <X />
        </Button>
      </div>

      <p className="mb-4 text-sm">
        <span className="text-[var(--text-secondary)]">Kết cục: </span>
        {outcomeOf(n)}
      </p>

      {/* UC-005 BR-3: "đã gửi" là máy chủ thư đã nhận, không phải đã tới hộp thư. */}
      {n.status === 'sent' && (
        <Alert className="mb-4">
          <Info />
          <AlertDescription>
            <span className="font-mono">sent</span> nghĩa là máy chủ thư đã nhận thư, chưa chắc đã vào hộp thư
            người nhận. Thư vào mục rác hay bị chặn ở phía nhận thì hệ thống không thấy được.
          </AlertDescription>
        </Alert>
      )}
      {unknown && (
        <Alert className="mb-4 bg-[var(--solar)]/10">
          <TriangleAlert className="text-[var(--solar)]" />
          <AlertDescription>
            Không chắc thư đã đi hay chưa — máy chủ thư không trả lời kịp. Hệ thống <strong>không tự gửi lại</strong>,
            để người nhận không bị nhận hai lần. Muốn gửi lại thì app service gửi một lần mới.
          </AlertDescription>
        </Alert>
      )}

      <dl className="mb-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-[var(--text-secondary)]">Mã người nhận</dt>
        <dd className="font-mono">
          {n.externalId ? (
            n.externalId
          ) : (
            <span className="text-[var(--text-muted)]">không còn trong sổ người nhận</span>
          )}
        </dd>
        <dt className="text-[var(--text-secondary)]">idempotencyKey</dt>
        <dd className="truncate font-mono">{n.idempotencyKey ?? '—'}</dd>
        {n.recipient?.error && (
          <>
            <dt className="text-[var(--text-secondary)]">Lỗi</dt>
            <dd className="font-mono break-words">{n.recipient.error}</dd>
          </>
        )}
      </dl>

      <div className="rounded-lg border px-3 py-1">
        <Step label="App gọi API" at={n.createdAt} />
        <Step label="Vào hàng đợi" at={n.queuedAt} />
        <Step label="Bắt đầu gửi" at={n.sendingAt} />
        <Step label="Máy chủ thư nhận" at={n.recipient?.sentAt ?? null} />
        <Step label="Kết thúc" at={n.finishedAt} />
      </div>

      {n.externalId && (
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          Muốn biết vì sao người này bị chặn: xem cài đặt nhận tin ở{' '}
          <Link href="/users" className="text-[var(--starlight)] underline-offset-2 hover:underline">
            Người nhận
          </Link>{' '}
          (tìm <span className="font-mono">{n.externalId}</span>). Cài đặt ở đó là hiện tại, không phải lúc gửi.
        </p>
      )}
    </Panel>
  )
}
