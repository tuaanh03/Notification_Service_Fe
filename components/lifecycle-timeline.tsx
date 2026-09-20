'use client'
import { useId } from 'react'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import {
  BRANCHES_NOT_TAKEN,
  TERMINAL_CAPTIONS,
  TERMINAL_STATUSES,
  fmtIso,
  lifecycleOf,
  mailLeft,
  type Notification,
} from '@/lib/mock-data'
import { statusColors, type NotificationStatus } from '@/lib/theme'
import { cn } from '@/lib/utils'

const W = 1000
const H = 190
const Y = 80
const STUB_DY = 46

/**
 * Vòng đời notification (07 §B1, SM §3) — orbital timeline ngang:
 * node = trạng thái đã đi qua (mốc giờ dưới), đường đi phát sáng cyan; nhánh không đi = stub gạch đứt;
 * event horizon = vạch dọc giữa `queued` và `sending` (ranh giới không thu hồi). `compact` = bản thu gọn cho list.
 * Reduced motion: để CSS (`@media (prefers-reduced-motion)` ở globals.css) tắt animation — không gate bằng
 * useReducedMotion vì SSR trả null còn client trả true → hydration mismatch (#418).
 */
export function LifecycleTimeline({ notification, compact = false }: { notification: Notification; compact?: boolean }) {
  const uid = useId()
  const steps = lifecycleOf(notification)
  const n = steps.length
  const xs = steps.map((_, i) => (n === 1 ? W / 2 : 80 + (i * (W - 160)) / (n - 1)))
  const horizonIdx = steps.findIndex((s) => s.status === 'sending')
  const horizonX = horizonIdx > 0 ? (xs[horizonIdx - 1] + xs[horizonIdx]) / 2 : null
  const last = steps[n - 1]
  const terminal = TERMINAL_STATUSES.includes(last.status)
  const left = mailLeft(notification.status)
  const height = compact ? 110 : H
  const y = compact ? 55 : Y

  return (
    <div className={cn('min-w-0 max-w-full space-y-3', compact && 'space-y-1')} data-slot="lifecycle-timeline" data-status={last.status}>
      <div className="w-full max-w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${height}`} className={cn('w-full', compact ? 'min-w-[560px]' : 'min-w-[720px]')} role="img" aria-label={`Vòng đời: ${steps.map((s) => s.status).join(' → ')}`}>
          <defs>
            <linearGradient id={`${uid}-horizon`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--pulsar)" stopOpacity="0" />
              <stop offset=".5" stopColor="var(--supernova)" stopOpacity=".9" />
              <stop offset="1" stopColor="var(--pulsar)" stopOpacity="0" />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-20%" y="-200%" width="140%" height="500%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {/* đường đi đã qua: glow + nét chính */}
          {n > 1 && (
            <>
              <line x1={xs[0]} y1={y} x2={xs[n - 1]} y2={y} stroke="var(--starlight)" strokeWidth="6" opacity=".35" filter={`url(#${uid}-glow)`} />
              <line x1={xs[0]} y1={y} x2={xs[n - 1]} y2={y} stroke="var(--starlight)" strokeWidth="2" data-testid="path-taken" />
            </>
          )}
          {/* nhánh không đi: stub gạch đứt xám, có nhãn */}
          {!compact &&
            steps.map((s, i) =>
              (BRANCHES_NOT_TAKEN[s.status] ?? [])
                .filter((b) => !steps.some((t) => t.status === b))
                .map((b, k) => {
                  const dir = k % 2 === 0 ? -1 : 1
                  const ex = xs[i] + 70
                  const ey = y + dir * STUB_DY
                  return (
                    <g key={`${s.status}-${b}`} data-testid="branch-stub" opacity=".55">
                      <path d={`M${xs[i]} ${y} Q${xs[i] + 40} ${y} ${ex} ${ey}`} fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="4 4" />
                      <circle cx={ex} cy={ey} r="3" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="2 2" />
                      <text x={ex + 8} y={ey + 4} fontSize="10" fill="var(--text-muted)" className="font-mono">
                        {b}
                      </text>
                    </g>
                  )
                }),
            )}
          {/* event horizon queued → sending */}
          {horizonX !== null && (
            <g data-testid="event-horizon">
              <rect x={horizonX - 14} y={compact ? 8 : 14} width="28" height={height - (compact ? 16 : 28)} fill={`url(#${uid}-horizon)`} opacity=".25" />
              <line x1={horizonX} y1={compact ? 8 : 14} x2={horizonX} y2={height - (compact ? 8 : 14)} stroke={`url(#${uid}-horizon)`} strokeWidth="2" className="horizon-pulse" />
              {!compact && (
                <text
                  transform={`translate(${horizonX - 8} ${height - 18}) rotate(-90)`}
                  fontSize="10"
                  fill="var(--supernova)"
                  className="font-mono"
                  textAnchor="start"
                >
                  Ranh giới không thu hồi — lô đầu tiên rời hàng đợi
                </text>
              )}
            </g>
          )}
          {/* node */}
          {steps.map((s, i) => {
            const color = statusColors[s.status]
            const isLast = i === n - 1
            return (
              <g key={s.status} data-testid="lifecycle-node" data-status={s.status}>
                {isLast && terminal && <circle cx={xs[i]} cy={y} r="13" fill="none" stroke={color} strokeWidth="1.5" opacity=".7" />}
                {isLast && !terminal && (
                  <circle cx={xs[i]} cy={y} r="8" fill="none" stroke={color} strokeWidth="1.5" className="horizon-pulse" />
                )}
                <circle cx={xs[i]} cy={y} r="7" fill={isLast && terminal ? color : 'var(--deep)'} stroke={color} strokeWidth="2" />
                <text x={xs[i]} y={y - (compact ? 14 : 20)} textAnchor="middle" fontSize={compact ? 11 : 12} fill={color} className="font-mono">
                  {s.status}
                </text>
                {!compact && (
                  <text x={xs[i]} y={y + 28} textAnchor="middle" fontSize="10" fill="var(--text-muted)" className="font-mono tabular-nums">
                    {fmtIso(s.at)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={last.status} />
            {terminal && <span className="text-[var(--text-secondary)]">{TERMINAL_CAPTIONS[last.status as NotificationStatus]}</span>}
          </div>
          {/* legend: câu hỏi duy nhất quan trọng */}
          <Panel className="flex items-center gap-3 px-3 py-2 text-xs" data-testid="mail-left">
            <span className="text-[var(--text-secondary)]">Đã có thư nào rời hệ thống chưa?</span>
            {(['Chưa', 'Một phần', 'Rồi'] as const).map((k) => (
              <span
                key={k}
                className={cn(
                  'rounded-full border px-2 py-0.5 font-mono',
                  k === left
                    ? k === 'Rồi'
                      ? 'border-[var(--aurora)] text-[var(--aurora)]'
                      : k === 'Một phần'
                        ? 'border-[var(--solar)] text-[var(--solar)]'
                        : 'border-[var(--text-secondary)] text-[var(--text-primary)]'
                    : 'border-[var(--orbit)] text-[var(--text-muted)]',
                )}
                aria-current={k === left ? 'true' : undefined}
              >
                {k}
              </span>
            ))}
          </Panel>
        </div>
      )}
    </div>
  )
}
