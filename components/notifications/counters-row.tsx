import { StatPill } from '@/components/stat-pill'
import { notificationCounters, type Notification } from '@/lib/mock-data'

/** 07 §B2 — 6 StatPill + stacked bar cùng tỷ lệ; mọi số từ notificationCounters(). */
export function CountersRow({ notification }: { notification: Notification }) {
  const c = notificationCounters(notification)
  const parts = [
    { label: 'Đã gửi', value: c.sent, color: 'var(--aurora)' },
    { label: 'Bounce', value: c.bounce, color: 'var(--solar)' },
    { label: 'Lỗi phát', value: c.failed, color: 'var(--supernova)' },
    { label: 'Bị trừ vì đã tắt', value: c.optedOut, color: 'var(--text-muted)' },
    { label: 'Không có kênh active', value: c.noChannel, color: 'var(--orbit)' },
  ]
  const total = Math.max(c.resolved, 1)
  return (
    <div className="space-y-3" data-testid="counters">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatPill label="Giải ra" value={c.resolved} />
        {parts.map((p) => (
          <StatPill key={p.label} label={p.label} value={p.value} />
        ))}
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--orbit)]" role="img" aria-label="Phân bổ người nhận">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
          ))}
      </div>
      <div className="flex flex-wrap gap-3 font-mono text-[10px] text-[var(--text-muted)]">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1">
            <i className="size-2 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="tabular-nums">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
