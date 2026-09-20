'use client'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { cosmicTokens } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

/** Số lớn mono + label nhỏ + sparkline tuỳ chọn (01 §2). Màu chart từ lib/theme, không hex. */
export function StatPill({
  label,
  value,
  delta,
  trend,
}: {
  label: string
  value: string | number
  /** ví dụ "12.4%" hoặc "-0.3%" — dấu âm → màu supernova */
  delta?: string
  /** 5–12 điểm gần nhất */
  trend?: number[]
}) {
  const down = delta?.trim().startsWith('-')
  return (
    <Panel className="min-w-0 flex-1 p-4">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <strong className="font-mono text-2xl tabular-nums text-[var(--text-primary)]">{value}</strong>
          {delta && (
            <span
              className={cn(
                'ml-2 inline-flex items-center gap-1 font-mono text-xs tabular-nums',
                down ? 'text-[var(--supernova)]' : 'text-[var(--aurora)]',
              )}
            >
              {down ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
              {delta}
            </span>
          )}
        </div>
        {trend && trend.length > 1 && (
          <div className="h-8 w-20 shrink-0" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.map((v) => ({ v }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={down ? cosmicTokens.supernova : cosmicTokens.starlight}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Panel>
  )
}
