'use client'

import Link from 'next/link'
import { Ban, CalendarClock, CheckCircle2, Copy, FilePlus2, Save, Send, Square, Undo2 } from 'lucide-react'
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
          <h2 className="font-heading text-xl">Đang chờ {UNDO_WINDOW_SECONDS} giây trước khi lô đầu rời hàng đợi.</h2>
          <p className="mt-2 text-sm text-[var(--text-primary)]">Huỷ bây giờ thì không ai nhận gì.</p>
          <Button type="button" variant="destructive" onClick={sim.cancel} className="mt-5">
            <Ban className="size-4" />
            Huỷ gửi
          </Button>
        </div>
      </Panel>
    )

  if (state === 'pending_approval')
    return (
      <Panel glow className="p-5">
        <StatusPill status="pending_approval" />
        <Alert className="mt-3 border-[var(--solar)]/25 bg-[var(--solar)]/10">
          <AlertTitle className="font-heading text-base text-[var(--text-primary)]">Chờ Super Admin duyệt</AlertTitle>
          <AlertDescription className="text-[var(--solar)]">
            Lần gửi này cần Super Admin duyệt. Đã gửi yêu cầu kèm link xem thử đúng bản sẽ gửi.
          </AlertDescription>
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
              Sẽ gửi lúc{' '}
              <span className="font-mono tabular-nums text-[var(--pulsar)]">
                {new Date(scheduledAt).toLocaleString('vi-VN')}
              </span>
            </h2>
          </div>
          <CalendarClock className="size-8 text-[var(--pulsar)]" />
        </div>
        {outsideWorkingHours(scheduledAt) && (
          <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/10">
            <AlertDescription className="text-[var(--solar)]">
              Thư sẽ tới lúc <span className="font-mono tabular-nums">{formatTime(scheduledAt)}</span> — ngoài
              giờ làm việc.
            </AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-[var(--text-secondary)]">
          Nội dung đã khoá. Người nhận sẽ được giải lại từ đầu tại thời điểm chạy — người mới vào role thì nhận,
          người vừa tắt thì không.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={sim.unschedule}>
            <Undo2 /> Huỷ lịch để sửa
          </Button>
          <Button type="button" variant="destructive" onClick={sim.cancel}>
            <Ban /> Bỏ hẳn
          </Button>
        </div>
      </Panel>
    )

  if (state === 'cancelled')
    return (
      <Panel className="p-5">
        <StatusPill status="cancelled" />
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Lần gửi đã huỷ. Chưa có thư nào rời hệ thống. Bản nháp được giữ lại để sửa.
        </p>
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
              Lô đầu tiên đã rời hàng đợi
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <StatusPill status={state} />
            <h2 className="mt-2 font-heading text-xl">{terminal ? 'Lần gửi đã kết thúc' : 'Đang xử lý lần gửi'}</h2>
          </div>
          <div className="flex size-20 items-center justify-center rounded-full border-4 border-[var(--starlight)]/70 font-mono text-xl tabular-nums text-[var(--text-primary)]">
            {pct}%
          </div>
        </div>
        <div className="grid gap-3 font-mono text-sm tabular-nums text-[var(--text-primary)] sm:grid-cols-3">
          <span>
            Đã gửi {sent} / {total}
          </span>
          <span>Bounce {bounce}</span>
          <span>Bị trừ {deducted}</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {state === 'queued' && 'Chưa có thư nào rời hệ thống. Huỷ được sạch.'}
          {state === 'sending' && 'Từ đây không thu hồi được. Chỉ dừng được phần chưa gửi.'}
          {state === 'stopped' && `Đã gửi ${sent}/${total}, dừng ${total - sent}.`}
          {state === 'sent' && `Đã gửi ${sent}/${total}. Số thật đã chốt lúc gửi.`}
        </p>
        {/* SM-3: Huỷ chỉ khi queued, Dừng gửi chỉ khi sending — không bao giờ cùng lúc */}
        {state === 'queued' && (
          <Button type="button" variant="destructive" onClick={sim.cancel}>
            <Ban className="size-4" />
            Huỷ
          </Button>
        )}
        {state === 'sending' && (
          <Button type="button" variant="destructive" onClick={sim.stop}>
            <Square className="size-4" />
            Dừng gửi
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
        <h2 className="font-heading text-lg">Gửi</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Một bản nháp chỉ được gửi một lần.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" variant="outline" disabled={!enabled} onClick={onSchedule}>
          <CalendarClock className="size-4" />
          Hẹn giờ
        </Button>
        <Button type="button" size="lg" disabled={!enabled} onClick={onSend} className="disabled:cursor-not-allowed disabled:opacity-40">
          <Send className="size-4" />
          Gửi ngay <span className="font-mono tabular-nums">({total})</span>
        </Button>
      </div>
    </Panel>
  )
}

function ResultPanel({ topic }: { topic: string }) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--aurora)]/20 bg-[var(--aurora)]/5 p-4">
      <div className="flex items-center gap-2 text-[var(--aurora)]">
        <CheckCircle2 className="size-4" />
        Kết quả đã ghi nhận
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => toast.success('Đã nhân bản thành bản nháp mới', { description: 'Giữ topic, template, biến — không sao chép danh sách người nhận cũ.' })}>
          <Copy className="size-4" />
          Nhân bản
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            toast.success('Đã tạo template draft', {
              description: 'Lưu ở Templates dưới dạng draft — người thật phải xem thử và Xuất bản, không tự publish.',
            })
          }
        >
          <Save className="size-4" />
          Lưu nội dung thành template
        </Button>
        <Button type="button" variant="outline">
          <FilePlus2 className="size-4" />
          Gửi thư đính chính
        </Button>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        Bản sao giữ topic, template và biến nhưng không sao chép danh sách người nhận cũ.
      </p>
      <p className="text-sm text-[var(--text-secondary)]">
        Thư đính chính chỉ tới đúng những người đã nhận (lấy từ snapshot). Người chưa nhận thì đừng làm họ bối rối.
      </p>
      {/* UC-008 BR-12: không có nút thu hồi — chỉ một câu giải thích */}
      <p className="text-sm text-[var(--text-muted)]">
        Không có nút thu hồi. Recall của Outlook chỉ chạy nội bộ và thường thất bại nếu thư đã mở.
      </p>
      <Link className="text-sm text-[var(--starlight)] underline" href={`/notifications/ntf_demo_${topic}`}>
        Mở chi tiết notification
      </Link>
    </div>
  )
}
