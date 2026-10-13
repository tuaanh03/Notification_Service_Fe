'use client'

import { useState } from 'react'
import { Info, TriangleAlert, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { AppLink } from '@/components/app-link'
import type { NotificationSummaryDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { tOr } from '@/i18n/dynamic'

/** Tiền tố backend ghi vào `error` khi không biết thư đã đi hay chưa (`OUTCOME_UNKNOWN`). */
const OUTCOME_UNKNOWN = 'outcome_unknown'

/**
 * Câu "vì sao thư KHÔNG được gửi" — khớp `exclusion_reason` của backend (`messages/*.json` nhóm
 * `exclusion`). Lý do chưa có câu dịch thì hiện nguyên mã.
 */
export function useExclusionLabel(): (reason: string) => string {
  const t = useTranslations('exclusion')
  return (reason) => tOr(t, reason)
}

/** Một câu trả lời "thư này ra sao" — dùng chung cho cột Kết cục và panel chi tiết. */
export function useOutcomeOf(): (n: NotificationSummaryDto) => string {
  const t = useTranslations('outcome')
  const exclusion = useExclusionLabel()
  return (n) => {
    const r = n.recipient
    if (!r) return n.status === 'queued' ? t('queued') : '—'
    if (r.exclusionReason) return t('excluded', { reason: exclusion(r.exclusionReason) })
    if (r.error?.startsWith(OUTCOME_UNKNOWN)) return t('unknown')
    if (r.error) return t('rejected')
    if (r.status === 'sent') return t('accepted')
    return t('sending')
  }
}

function Step({ label, at }: { label: string; at: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-1.5 last:border-b-0">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-xs tabular-nums">{at ? fmtDateTime(at) : '—'}</span>
    </div>
  )
}

/**
 * Chi tiết một lần gửi, mở từ dòng trong Lịch sử gửi — ngăn trượt từ bên phải.
 *
 * Mọi thứ ở đây đã có sẵn trong dòng danh sách — không gọi thêm API. Không hiện địa chỉ email
 * (có ở màn Người nhận) và không hiện nội dung thư (app service đã giữ nội dung đó).
 * Không có nút Huỷ / Dừng / Gửi lại: MVP không có lệnh nào như vậy.
 *
 * Không làm tối trang (`modal={false}`): bảng vẫn bấm được, bấm dòng khác là ngăn đổi nội dung luôn.
 * `notification = null` là đóng; lần gửi vừa xem được giữ lại để ngăn trượt ra không bị trống.
 *
 * `linkRecipient = false` khi bảng đã nằm trong chính trang của người nhận — không dẫn về chính nó.
 */
export function NotificationOutcome({
  notification,
  linkRecipient,
  onClose,
}: {
  notification: NotificationSummaryDto | null
  linkRecipient: boolean
  onClose: () => void
}) {
  const [shown, setShown] = useState(notification)
  if (notification && notification !== shown) setShown(notification)

  return (
    <Drawer
      open={notification !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      swipeDirection="right"
      modal={false}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:28rem]">
        {shown && <OutcomeDetail n={shown} linkRecipient={linkRecipient} />}
      </DrawerContent>
    </Drawer>
  )
}

/**
 * Template đã dùng cho lần gửi: "tên · vN" (bản đã đổ biến lúc app gọi — ADR-0020). "—" = nội dung viết
 * thẳng. Nguồn duy nhất của chữ này, dùng chung cột bảng và panel.
 */
export function templateLabelOf(n: NotificationSummaryDto) {
  if (!n.template) return <span className="text-[var(--text-muted)]">—</span>
  return (
    <span className="text-xs">
      {n.template.name} <span className="font-mono text-[var(--text-muted)]">· v{n.template.version}</span>
    </span>
  )
}

function OutcomeDetail({ n, linkRecipient }: { n: NotificationSummaryDto; linkRecipient: boolean }) {
  const t = useTranslations('outcome')
  const tc = useTranslations('common')
  const outcomeOf = useOutcomeOf()
  const unknown = n.recipient?.error?.startsWith(OUTCOME_UNKNOWN) ?? false
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>

  return (
    <>
      <DrawerHeader className="flex-row items-start justify-between gap-4 pb-4">
        <div className="min-w-0">
          <DrawerTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="font-mono">{n.topic || '—'}</span>
            <StatusPill status={n.status} />
          </DrawerTitle>
          <DrawerDescription>
            <Button
              variant="link"
              size="xs"
              className="h-auto max-w-full truncate px-0 font-mono text-[var(--text-secondary)]"
              onClick={() => {
                navigator.clipboard?.writeText(n.id)
                toast.success(tc('copied'), { description: n.id })
              }}
            >
              {n.id}
            </Button>
          </DrawerDescription>
        </div>
        <DrawerClose render={<Button variant="ghost" size="icon-sm" aria-label={tc('close')} />}>
          <X />
        </DrawerClose>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-4 text-sm">
          <span className="text-[var(--text-secondary)]">{t('label')}</span>
          {outcomeOf(n)}
        </p>

        {/* UC-005 BR-3: "đã gửi" là máy chủ thư đã nhận, không phải đã tới hộp thư. */}
        {n.status === 'sent' && (
          <Alert className="mb-4">
            <Info />
            <AlertDescription>{t.rich('sentNote', { mono, b: (chunks) => <b className="font-medium">{chunks}</b> })}</AlertDescription>
          </Alert>
        )}
        {unknown && (
          <Alert className="mb-4 bg-[var(--solar)]/10">
            <TriangleAlert className="text-[var(--solar)]" />
            <AlertDescription>
              {t.rich('unknownNote', { b: (chunks) => <strong>{chunks}</strong> })}
            </AlertDescription>
          </Alert>
        )}

        <dl className="mb-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-[var(--text-secondary)]">{t('recipientId')}</dt>
          <dd className="font-mono">
            {n.externalId ? (
              n.externalId
            ) : (
              <span className="text-[var(--text-muted)]">{t('recipientGone')}</span>
            )}
          </dd>
          <dt className="text-[var(--text-secondary)]">{t('template')}</dt>
          <dd className="min-w-0">{templateLabelOf(n)}</dd>
          <dt className="text-[var(--text-secondary)]">idempotencyKey</dt>
          <dd className="truncate font-mono">{n.idempotencyKey ?? '—'}</dd>
          {n.recipient?.error && (
            <>
              <dt className="text-[var(--text-secondary)]">{t('error')}</dt>
              <dd className="font-mono break-words">{n.recipient.error}</dd>
            </>
          )}
        </dl>

        {/* Đối chiếu với log máy chủ (UTC) hay nhất ở đây — nói rõ giờ đang xem là giờ nào. */}
        <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">{tc('vnTime')}</p>
        <div className="rounded-lg border px-3 py-1">
          <Step label={t('stepCalled')} at={n.createdAt} />
          <Step label={t('stepQueued')} at={n.queuedAt} />
          <Step label={t('stepSending')} at={n.sendingAt} />
          <Step label={t('stepAccepted')} at={n.recipient?.sentAt ?? null} />
          <Step label={t('stepFinished')} at={n.finishedAt} />
        </div>
      </div>

      {n.externalId && linkRecipient && (
        <DrawerFooter className="border-t pt-3">
          <p className="text-[11px] text-[var(--text-muted)]">
            {t.rich('whyBlocked', {
              id: n.externalId,
              mono,
              link: (chunks) => (
                <AppLink
                  href={`/users/${encodeURIComponent(n.externalId!)}`}
                  className="text-[var(--starlight)] underline-offset-2 hover:underline"
                >
                  {chunks}
                </AppLink>
              ),
            })}
          </p>
        </DrawerFooter>
      )}
    </>
  )
}
