'use client'
import { useCallback, useEffect, useState } from 'react'

/** Cửa sổ huỷ sau khi bấm Gửi (UC-008 §E, quyết định 11_gia_dinh). Đặt 0 để tắt. */
export const UNDO_WINDOW_SECONDS = 60
/** ~2 người / giây — đủ chậm để kịp bấm Dừng gửi (bẫy §6 CLAUDE.md). */
const SEND_TICK_MS = 500
const QUEUE_HOLD_MS = 2500

export type SendState =
  | 'idle'
  | 'undo'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'stopped'
  | 'cancelled'
  | 'pending_approval'
  | 'scheduled'

export const TERMINAL: SendState[] = ['sent', 'stopped', 'cancelled']

/**
 * Mô phỏng vòng đời một lần gửi tay: undo → queued → sending → sent, với Huỷ / Dừng / Hẹn giờ.
 * Chỉ state + timer — UI ở <SendBlock>. Composer giữ hook để biết đang có lần gửi chạy (chặn bấm Gửi hai lần).
 */
export function useSendSimulation(total: number) {
  const [state, setState] = useState<SendState>('idle')
  const [seconds, setSeconds] = useState(UNDO_WINDOW_SECONDS)
  const [sent, setSent] = useState(0)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)

  const start = useCallback((requiresApproval: boolean) => {
    setSent(0)
    if (requiresApproval) setState('pending_approval')
    else if (UNDO_WINDOW_SECONDS > 0) {
      setSeconds(UNDO_WINDOW_SECONDS)
      setState('undo')
    } else setState('queued')
  }, [])
  const schedule = useCallback((at: string) => {
    setScheduledAt(at)
    setState('scheduled')
  }, [])
  /** Huỷ lịch để sửa → về draft (idle), nội dung giữ nguyên */
  const unschedule = useCallback(() => {
    setScheduledAt(null)
    setState('idle')
  }, [])
  const cancel = useCallback(() => setState('cancelled'), [])
  const stop = useCallback(() => setState('stopped'), [])

  // undo → queued
  useEffect(() => {
    if (state !== 'undo') return
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          setState('queued')
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [state])

  // queued → sending (event horizon)
  useEffect(() => {
    if (state !== 'queued') return
    const timer = window.setTimeout(() => setState('sending'), QUEUE_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [state])

  // sending → sent
  useEffect(() => {
    if (state !== 'sending') return
    const timer = window.setInterval(() => {
      setSent((value) => {
        const next = Math.min(total, value + 1)
        if (next >= total) {
          window.clearInterval(timer)
          setState('sent')
        }
        return next
      })
    }, SEND_TICK_MS)
    return () => window.clearInterval(timer)
  }, [state, total])

  const running = state !== 'idle' && !TERMINAL.includes(state)
  return { state, seconds, sent, scheduledAt, running, start, schedule, unschedule, cancel, stop }
}
export type SendSimulation = ReturnType<typeof useSendSimulation>
