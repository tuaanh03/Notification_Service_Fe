'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { discardDeadLetterAction, requeueDeadLetterAction } from '@/app/admin/queue/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { InfoHint } from '@/components/info-hint'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { tOr } from '@/i18n/dynamic'
import type { DeadLetterDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

type Row = DeadLetterDto & { key: string; lane: string } & Record<string, unknown>

/** Khớp giới hạn backend (`DISCARD_REASON_TOO_LONG`). */
const MAX_REASON = 500

/**
 * Tab Message lỗi của Hàng chờ gửi (ADR-0042 của backend): message hàng đợi đã bỏ cuộc (lỗi không thử lại được, hoặc hết
 * số lần thử). Đẩy lại = về hàng đợi gốc xử lý lại (an toàn: không gửi trùng). Bỏ = xoá hẳn, bắt buộc ghi lý do. Không hiện
 * nội dung thư — chỉ loại sự kiện + mã đối tượng.
 */
export function QueueDeadLettersTab({ letters }: { letters: DeadLetterDto[] }) {
  const t = useTranslations('queueAdmin')
  const ta = useTranslations('auditActions')
  const te = useTranslations('errors')
  const format = useFormatter()
  const router = useRouter()
  const [discarding, setDiscarding] = useState<Row | null>(null)
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()

  const laneOf = (stream: string) => tOr(t, `stream_${stream.replaceAll('.', '_')}`, stream)
  const rows: Row[] = letters.map((l) => ({ ...l, key: `${l.stream}/${l.id}`, lane: laneOf(l.stream) }))

  const requeue = (r: Row) =>
    startTransition(async () => {
      const result = await requeueDeadLetterAction(r.stream, r.id)
      if (!result.ok) {
        toast.error(te('withCode', { message: result.message, code: result.code }))
        return
      }
      toast.success(t('requeued'))
      router.refresh()
    })

  const discard = () =>
    startTransition(async () => {
      if (!discarding) return
      const result = await discardDeadLetterAction(discarding.stream, discarding.id, reason.trim())
      if (!result.ok) {
        toast.error(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setDiscarding(null)
      setReason('')
      toast.success(t('discarded'))
      router.refresh()
    })

  const columns: Column<Row>[] = [
    { key: 'deadLetteredAt', label: t('colAt'), render: (r) => <span className="tabular-nums">{fmtDateTime(r.deadLetteredAt)}</span> },
    { key: 'lane', label: t('colLane') },
    {
      key: 'eventType',
      label: t('colEvent'),
      render: (r) => (
        <span className="flex items-center gap-1">
          {r.eventType ? tOr(ta, r.eventType) : '—'}
          {r.aggregateId && <span className="font-mono text-[11px] text-[var(--text-muted)]">{r.aggregateId.slice(0, 8)}</span>}
        </span>
      ),
    },
    {
      key: 'reason',
      label: t('colReason'),
      render: (r) => (
        <span className="flex items-center gap-1">
          {tOr(t, `reason_${r.reason}`, r.reason)}
          <InfoHint
            label={t('errorDetail')}
            summary={t('errorSummary', { deliveries: format.number(r.deliveries) })}
            items={[{ term: t('errorDetail'), definition: r.error || '—' }]}
          />
        </span>
      ),
    },
    {
      key: 'key',
      label: t('colActions'),
      align: 'right',
      render: (r) => (
        <span className="flex justify-end gap-1">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => requeue(r)}>
            <RotateCcw /> {t('requeue')}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDiscarding(r)} aria-label={t('discard')}>
            <Trash2 />
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div data-testid="queue-dead-letters">
      <p className="mb-3 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        {t('errorsIntro')}
        <InfoHint label={t('errorsTab')} summary={t('errorsInfo')} />
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        filterKey="lane"
        chipMono={false}
        hideSearch
        empty={<EmptyState icon={CheckCircle2} title={t('errorsEmptyTitle')} description={t('errorsEmptyBody')} />}
      />

      <ConfirmDialog
        open={discarding !== null}
        tone="blocking"
        title={t('discardTitle')}
        description={t('discardBody')}
        confirmLabel={t('discard')}
        confirmDisabled={pending || reason.trim() === '' || reason.length > MAX_REASON}
        onConfirm={discard}
        onCancel={() => {
          setDiscarding(null)
          setReason('')
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="discard-reason">{t('discardReason')}</Label>
          <Textarea
            id="discard-reason"
            value={reason}
            maxLength={MAX_REASON}
            placeholder={t('discardReasonPlaceholder')}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
