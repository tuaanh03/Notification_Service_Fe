'use client'
import { useState } from 'react'
import { Ban, CalendarClock, Undo2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { MOCK_NOW, scheduledSends, type ScheduledSend } from '@/lib/mock-data'
import { fmtDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

/** Đếm ngược từ MOCK_NOW (không Date.now lúc render) — `2h 15m` / `overdue` (chữ quá giờ do màn truyền vào). */
const countdown = (runAt: string, overdue: string) => {
  const diff = Math.round((new Date(runAt).getTime() - new Date(MOCK_NOW).getTime()) / 60_000)
  if (diff <= 0) return overdue
  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`
}

/** 07 §C — card lần gửi đã lên lịch; hai lối ra khác nhau (UC-008 §E); có 1 card failed để phủ exception. */
export function ScheduledCards() {
  const t = useTranslations('scheduled')
  const [items, setItems] = useState<ScheduledSend[]>(scheduledSends)
  const [pending, setPending] = useState<{ item: ScheduledSend; action: 'unschedule' | 'cancel' } | null>(null)
  if (items.length === 0)
    return <EmptyState icon={CalendarClock} title={t('emptyTitle')} description={t('emptyBody')} />
  const commit = () => {
    if (!pending) return
    setItems((prev) => prev.filter((i) => i.id !== pending.item.id))
    toast.success(pending.action === 'unschedule' ? t('unscheduled') : t('dropped'), {
      description: `${pending.item.id} → ${pending.action === 'unschedule' ? 'draft' : 'cancelled'}`,
    })
    setPending(null)
  }
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((s) => {
          const failed = Boolean(s.error)
          return (
            <Panel key={s.id} className={cn('flex flex-col gap-3 p-5', failed && 'border-[var(--supernova)]/40')} data-testid="scheduled-card" data-failed={failed}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-[var(--text-muted)]">{s.id}</p>
                  <p className="mt-1 truncate font-mono text-sm text-[var(--starlight)]">{s.topic_key}</p>
                </div>
                <StatusPill status={failed ? 'failed' : 'scheduled'} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn('font-mono text-2xl tabular-nums', failed ? 'text-[var(--supernova)]' : 'text-[var(--pulsar)]')}>{countdown(s.run_at, t('overdue'))}</span>
                <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">{fmtDateTime(s.run_at)}</span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-[var(--text-muted)]">template</dt>
                <dd className="font-mono">{s.template}</dd>
                <dt className="text-[var(--text-muted)]">{t('recipients')}</dt>
                <dd className="font-mono tabular-nums">
                  ~{s.estimate} <span className="text-[var(--text-muted)]">{t('estimate')}</span>
                </dd>
                <dt className="text-[var(--text-muted)]">{t('author')}</dt>
                <dd>{s.author}</dd>
              </dl>
              {failed ? (
                <Alert variant="destructive" className="border-[var(--supernova)]/40 bg-[var(--supernova)]/10">
                  <AlertDescription className="text-[var(--supernova)]">{s.error}</AlertDescription>
                </Alert>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">
                  {t('reresolve')}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPending({ item: s, action: 'unschedule' })}>
                  <Undo2 /> {failed ? t('reopen') : t('unscheduleToEdit')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setPending({ item: s, action: 'cancel' })}>
                  <Ban /> {t('drop')}
                </Button>
              </div>
            </Panel>
          )
        })}
      </div>
      <ConfirmDialog
        open={pending !== null}
        tone={pending?.action === 'cancel' ? 'blocking' : 'warning'}
        title={pending?.action === 'cancel' ? t('dropTitle') : t('unscheduleTitle')}
        description={
          pending?.action === 'cancel'
            ? t('dropBody')
            : t('unscheduleBody')
        }
        facts={pending ? [['topic', pending.item.topic_key], [t('recipients'), t('estimateFact', { count: pending.item.estimate })], ['template', pending.item.template]] : []}
        confirmLabel={pending?.action === 'cancel' ? t('drop') : t('unschedule')}
        onConfirm={commit}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
