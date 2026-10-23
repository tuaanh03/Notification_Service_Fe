'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { setGroupPausedAction } from '@/app/admin/queue/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { InfoHint } from '@/components/info-hint'
import { Panel } from '@/components/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { tOr } from '@/i18n/dynamic'
import type { QueueGroupDto, QueuesDto } from '@/lib/api/types'

/** Worker chạm Redis trong khoảng này coi là còn sống (vòng lặp đọc tối đa 5 giây một lần). */
const ALIVE_MS = 60_000

/**
 * Tab Stream của Hàng chờ gửi (ADR-0042 của backend): mỗi nhóm xử lý một thẻ — chờ giao, đang xử lý, message lỗi,
 * worker còn sống, thông số đang áp; nút Tạm dừng / Chạy lại (có xác nhận). Nhóm Nhật ký hệ thống không tạm dừng được.
 */
export function QueueStreamsTab({ queues, onShowErrors }: { queues: QueuesDto; onShowErrors: () => void }) {
  const t = useTranslations('queueAdmin')
  const te = useTranslations('errors')
  const format = useFormatter()
  const router = useRouter()
  // Nhóm đang hỏi xác nhận GIỮ lại khi hộp đóng — xoá ngay thì tiêu đề lóe thành `Tạm dừng ""` trong lúc hộp mờ dần.
  const [confirm, setConfirm] = useState<QueueGroupDto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const groupLabel = (group: string) => tOr(t, `group_${group.replaceAll('-', '_')}`, group)
  const seconds = (ms: number) => t('seconds', { n: format.number(Math.round(ms / 100) / 10) })
  const ago = (ms: number) =>
    ms < 60_000 ? t('secondsAgo', { n: format.number(Math.round(ms / 1000)) }) : t('minutesAgo', { n: format.number(Math.round(ms / 60_000)) })

  const toggle = (g: QueueGroupDto) =>
    startTransition(async () => {
      const result = await setGroupPausedAction(g.group, !g.paused)
      setConfirmOpen(false)
      if (!result.ok) {
        toast.error(te('withCode', { message: result.message, code: result.code }))
        return
      }
      toast.success(result.data.paused ? t('pausedToast', { name: groupLabel(g.group) }) : t('resumedToast', { name: groupLabel(g.group) }))
      router.refresh()
    })

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2" data-testid="queue-streams">
        {queues.groups.map((g) => {
          const alive = g.consumers.filter((c) => c.idleMs < ALIVE_MS)
          const freshest = g.consumers.length ? Math.min(...g.consumers.map((c) => c.idleMs)) : null
          return (
            <Panel key={g.group} className="p-5" data-testid={`queue-group-${g.group}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{groupLabel(g.group)}</h3>
                    <Badge
                      variant="outline"
                      className={g.paused ? 'border-[var(--solar)] text-[var(--solar)]' : 'text-[var(--text-secondary)]'}
                    >
                      {g.paused ? t('statusPaused') : t('statusRunning')}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">{g.stream}</p>
                </div>
                {g.pausable ? (
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => {
                      setConfirm(g)
                      setConfirmOpen(true)
                    }}>
                    {g.paused ? <Play /> : <Pause />} {g.paused ? t('resume') : t('pause')}
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    {t('notPausable')}
                    <InfoHint label={t('notPausable')} summary={t('notPausableInfo')} />
                  </span>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                <Metric label={t('lag')} value={g.lag === null ? '—' : format.number(g.lag)} />
                <Metric label={t('inFlight')} value={format.number(g.pending)} />
                <Metric
                  label={t('deadLetters')}
                  value={
                    g.deadLetters > 0 ? (
                      <button type="button" className="text-[var(--supernova)] underline" onClick={onShowErrors}>
                        {format.number(g.deadLetters)}
                      </button>
                    ) : (
                      '0'
                    )
                  }
                />
                <Metric label={t('workers')} value={format.number(alive.length)} />
              </dl>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {[
                  freshest === null ? t('noWorker') : t('lastSeen', { when: ago(freshest) }),
                  g.oldestPendingIdleMs !== null ? t('oldestPending', { when: ago(g.oldestPendingIdleMs) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-[var(--text-secondary)]">{t('params')}</summary>
                <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-[var(--text-secondary)]">
                  <dt>{t('paramBatch')}</dt>
                  <dd className="tabular-nums">{format.number(g.options.batchSize)}</dd>
                  <dt>{t('paramMaxDeliveries')}</dt>
                  <dd className="tabular-nums">{format.number(g.options.maxDeliveries)}</dd>
                  <dt>{t('paramClaimIdle')}</dt>
                  <dd className="tabular-nums">{seconds(g.options.claimIdleMs)}</dd>
                  <dt>{t('paramReclaim')}</dt>
                  <dd className="tabular-nums">{seconds(g.options.reclaimEveryMs)}</dd>
                  <dt>{t('paramBlock')}</dt>
                  <dd className="tabular-nums">{seconds(g.options.blockMs)}</dd>
                  <dt>{t('paramLength')}</dt>
                  <dd className="tabular-nums">{format.number(g.length)}</dd>
                </dl>
              </details>
            </Panel>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        {t('redisMemory', { mb: format.number(Math.round((queues.redis.usedMemoryBytes / 1024 / 1024) * 10) / 10) })}
      </p>

      <ConfirmDialog
        open={confirmOpen}
        title={confirm?.paused ? t('resumeTitle', { name: groupLabel(confirm.group) }) : t('pauseTitle', { name: confirm ? groupLabel(confirm.group) : '' })}
        description={confirm?.paused ? t('resumeBody') : t('pauseBody')}
        confirmLabel={confirm?.paused ? t('resume') : t('pause')}
        confirmDisabled={pending}
        onConfirm={() => confirm && toggle(confirm)}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
