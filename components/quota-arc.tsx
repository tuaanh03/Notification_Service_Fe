import { cn } from '@/lib/utils'

/**
 * Vòng quota (01 §3) — nguồn duy nhất cho gauge rate-limit: top bar (size 20) và /settings/quota (size 112).
 * stroke-dasharray theo % đã dùng; màu đổi sang solar ≥ 80 %, supernova khi chạm trần.
 */
export function QuotaArc({
  used,
  max,
  className,
  strokeWidth = 2,
  children,
}: {
  used: number
  max: number
  className?: string
  strokeWidth?: number
  children?: React.ReactNode
}) {
  const pct = Math.min(1, used / Math.max(max, 1))
  // r=8 trong viewBox 20 → chu vi ≈ 50.27
  const circumference = 50.27
  const stroke = pct >= 1 ? 'var(--supernova)' : pct >= 0.8 ? 'var(--solar)' : 'var(--starlight)'
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} data-slot="quota-arc" data-pct={Math.round(pct * 100)}>
      <svg viewBox="0 0 20 20" className="size-full -rotate-90" aria-hidden>
        <circle cx="10" cy="10" r="8" fill="none" stroke="var(--orbit)" strokeWidth={strokeWidth} />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${pct * circumference} ${circumference}`}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
