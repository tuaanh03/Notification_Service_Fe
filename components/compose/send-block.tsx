'use client'

import { AppLink } from '@/components/app-link'
import { Ban, CalendarClock, CheckCircle2, Copy, FilePlus2, Save, Send, Square, Undo2 } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { UNDO_WINDOW_SECONDS, type SendSimulation } from '@/hooks/use-send-simulation'
import type { RecipientEstimate } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { formatTime, outsideWorkingHours } from './schedule-dialog'

type SendBlockProps = {
  enabled: boolean
  onSend: () => void
  onSchedule: () => void
  topic: string
  estimate: RecipientEstimate
  sim: SendSimulation
}

/** Block 4 — UI cho state machine ở hooks/use-send-simulation.ts (Composer giữ hook). */
export function SendBlock({ enabled, onSend, onSchedule, topic, estimate, sim }: SendBlockProps) {
  const t = useTranslations('send')
  const ts = useTranslations('scheduled')
  const format = useFormatter()
  const mono = (chunks: React.ReactNode) => <span className="font-mono tabular-nums">{chunks}</span>
  const { state, seconds, sent, scheduledAt } = sim
  const total = estimate.expected
  // "Bị trừ" là số đã chốt từ helper — không phải counter chạy
  const deducted = estimate.optedOut + estimate.invalid + estimate.excluded
  const bounce = Math.min(4, Math.floor(sent / 10))
  const pct = Math.round((sent / Math.max(total, 1)) * 100)

  if (state === 'undo')
    return (
      <Panel glow className="border-[var(--starlight)]/40 p-6" aria-live="polite">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-full border-4 border-[var(--starlight)] font-mono text-3xl tabular-nums text-[var(--text-primary)] shadow-[var(--glow-starlight-lg)]">
            {seconds}
          </div>
          <h2 className="font-heading text-xl">{t('undoTitle', { seconds: UNDO_WINDOW_SECONDS })}</h2>
          <p className="mt-2 text-sm text-[var(--text-primary)]">{t('undoBody')}</p>
          <Button type="button" variant="destructive" onClick={sim.cancel} className="mt-5">
            <Ban className="size-4" />
            {t('undoCancel')}
          </Button>
        </div>
      </Panel>
    )

  if (state === 'pending_approval')
    return (
      <Panel glow className="p-5">
        <StatusPill status="pending_approval" />
        <Alert className="mt-3 border-[var(--solar)]/25 bg-[var(--solar)]/10">
          <AlertTitle className="font-heading text-base text-[var(--text-primary)]">{t('approvalTitle')}</AlertTitle>
          <AlertDescription className="text-[var(--solar)]">{t('approvalBody')}</AlertDescription>
        </Alert>
      </Panel>
    )

  // UC-008 §E Hẹn giờ: nội dung khoá, hai lối ra khác nhau — Huỷ lịch để sửa (→ draft) / Bỏ hẳn (→ cancelled)
  if (state === 'scheduled' && scheduledAt)
    return (
      <Panel glow className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <StatusPill status="scheduled" />
            <h2 className="mt-2 font-heading text-xl">
              {t.rich('scheduledAt', {
                at: format.dateTime(new Date(scheduledAt), { dateStyle: 'short', timeStyle: 'medium' }),
                mono: (chunks) => <span className="font-mono tabular-nums text-[var(--pulsar)]">{chunks}</span>,
              })}
            </h2>
          </div>
          <CalendarClock className="size-8 text-[var(--pulsar)]" />
        </div>
        {outsideWorkingHours(scheduledAt) && (
          <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/10">
            <AlertDescription className="text-[var(--solar)]">
              {t.rich('offHours', { time: formatTime(scheduledAt), mono })}
            </AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-[var(--text-secondary)]">{t('scheduledLocked')}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={sim.unschedule}>
            <Undo2 /> {ts('unscheduleToEdit')}
          </Button>
          <Button type="button" variant="destructive" onClick={sim.cancel}>
            <Ban /> {ts('drop')}
          </Button>
        </div>
      </Panel>
    )

  if (state === 'cancelled')
    return (
      <Panel className="p-5">
        <StatusPill status="cancelled" />
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{t('cancelledBody')}</p>
      </Panel>
    )

  if (state === 'queued' || state === 'sending' || state === 'sent' || state === 'stopped') {
    const terminal = state === 'sent' || state === 'stopped'
    return (
      <Panel className={cn('space-y-5 p-5', state === 'sending' && 'border-[var(--starlight)]/40')} glow={state === 'sending'}>
        {state !== 'queued' && (
          // Event horizon: lô đầu đã rời hàng đợi — từ đây UI đổi tính chất
          <div className="relative h-px bg-[var(--starlight)]/30">
            <div className={cn('absolute inset-y-0 left-0 w-2/3 bg-[var(--starlight)]', state === 'sending' && 'animate-pulse')} />
            <p className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--deep)] px-3 font-mono text-[11px] text-[var(--starlight)]">
              {t('horizon')}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <StatusPill status={state} />
            <h2 className="mt-2 font-heading text-xl">{terminal ? t('finished') : t('processing')}</h2>
          </div>
          <div className="flex size-20 items-center justify-center rounded-full border-4 border-[var(--starlight)]/70 font-mono text-xl tabular-nums text-[var(--text-primary)]">
            {pct}%
          </div>
        </div>
        <div className="grid gap-3 font-mono text-sm tabular-nums text-[var(--text-primary)] sm:grid-cols-3">
          <span>{t('sentCount', { sent, total })}</span>
          <span>{t('bounce', { count: bounce })}</span>
          <span>{t('deducted', { count: deducted })}</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {state === 'queued' && t('queuedNote')}
          {state === 'sending' && t('sendingNote')}
          {state === 'stopped' && t('stoppedNote', { sent, total, rest: total - sent })}
          {state === 'sent' && t('sentNote', { sent, total })}
        </p>
        {/* SM-3: Huỷ chỉ khi queued, Dừng gửi chỉ khi sending — không bao giờ cùng lúc */}
        {state === 'queued' && (
          <Button type="button" variant="destructive" onClick={sim.cancel}>
            <Ban className="size-4" />
            {t('cancel')}
          </Button>
        )}
        {state === 'sending' && (
          <Button type="button" variant="destructive" onClick={sim.stop}>
            <Square className="size-4" />
            {t('stop')}
          </Button>
        )}
        {terminal && <ResultPanel topic={topic} />}
      </Panel>
    )
  }

  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--starlight)]">block 04</p>
        <h2 className="font-heading text-lg">{t('title')}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t('oncePerDraft')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" variant="outline" disabled={!enabled} onClick={onSchedule}>
          <CalendarClock className="size-4" />
          {t('schedule')}
        </Button>
        <Button type="button" size="lg" disabled={!enabled} onClick={onSend} className="disabled:cursor-not-allowed disabled:opacity-40">
          <Send className="size-4" />
          {t('sendNow')} <span className="font-mono tabular-nums">({total})</span>
        </Button>
      </div>
    </Panel>
  )
}

function ResultPanel({ topic }: { topic: string }) {
  const t = useTranslations('send')
  return (
    <div className="space-y-4 rounded-xl border border-[var(--aurora)]/20 bg-[var(--aurora)]/5 p-4">
      <div className="flex items-center gap-2 text-[var(--aurora)]">
        <CheckCircle2 className="size-4" />
        {t('resultRecorded')}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => toast.success(t('duplicated'), { description: t('duplicatedBody') })}>
          <Copy className="size-4" />
          {t('duplicate')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            toast.success(t('savedTemplate'), { description: t('savedTemplateBody') })
          }
        >
          <Save className="size-4" />
          {t('saveAsTemplate')}
        </Button>
        <Button type="button" variant="outline">
          <FilePlus2 className="size-4" />
          {t('correction')}
        </Button>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{t('copyNote')}</p>
      <p className="text-sm text-[var(--text-secondary)]">{t('correctionNote')}</p>
      {/* UC-008 BR-12: không có nút thu hồi — chỉ một câu giải thích */}
      <p className="text-sm text-[var(--text-muted)]">{t('noRecall')}</p>
      <AppLink className="text-sm text-[var(--starlight)] underline" href={`/notifications/ntf_demo_${topic}`}>
        {t('openDetail')}
      </AppLink>
    </div>
  )
}
