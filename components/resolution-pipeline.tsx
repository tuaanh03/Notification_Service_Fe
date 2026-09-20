'use client'

import { useId, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { Panel } from '@/components/panel'
import { ReasonBadge } from '@/components/reason-badge'
import { Button } from '@/components/ui/button'
import { estimateRecipients } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

/** 5 bước cố định (UC-002 §C4, BR-5) — số từ một helper, không tính lại ở đây. */
function pipelineSteps(topicKey: string) {
  const e = estimateRecipients(topicKey)
  const bindings = e.bindings ?? 0
  const expanded = e.expanded ?? e.active
  const deduped = e.deduped ?? e.active
  const afterSubtract = Math.max(0, deduped - e.excluded - e.optedOut)
  return {
    e,
    steps: [
      { count: bindings, unit: 'binding', label: 'Lấy binding included' },
      { count: expanded, unit: 'người', label: 'Bung role / group qua Directory Resolver' },
      {
        count: deduped,
        unit: 'người',
        label: 'Gộp trùng theo user_id',
        note: expanded > deduped ? `${expanded - deduped} người trúng 2 binding — nhận đúng 1 lần` : undefined,
      },
      {
        count: afterSubtract,
        unit: 'người',
        label: 'Trừ excluded và người đã opt-out',
        note: `${e.excluded} excluded, ${e.optedOut} opted_out`,
      },
      { count: e.expected, unit: 'người nhận', label: 'Map sang subscription active khớp default_channels' },
    ],
  }
}

// Toạ độ node trên track (viewBox 1000×140): 5 node cách đều, đường cong nhẹ lên/xuống xen kẽ.
const NODE_X = [60, 280, 500, 720, 940]
const NODE_Y = [70, 46, 74, 50, 70]
const segmentPath = (i: number) => {
  const x1 = NODE_X[i], y1 = NODE_Y[i], x2 = NODE_X[i + 1], y2 = NODE_Y[i + 1]
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + (i % 2 ? 28 : -28)
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

/** Số hạt trên đoạn i ∝ số người còn lại sau bước i (đậm ở đầu, mỏng dần theo drop-off). */
const particlesFor = (count: number, max: number) => (max <= 0 ? 0 : Math.max(1, Math.round((count / max) * 6)))

export function ResolutionPipeline({ topicKey, readOnly }: { topicKey: string; readOnly?: boolean }) {
  const [open, setOpen] = useState(Boolean(readOnly))
  const [lists, setLists] = useState<Record<string, boolean>>({})
  const reduced = useReducedMotion()
  // id SVG duy nhất — Composer và Topics có thể render 2 pipeline cùng trang
  const uid = useId().replace(/:/g, '')
  const { e, steps } = pipelineSteps(topicKey)
  const max = Math.max(...steps.slice(1).map((s) => s.count), 1)
  const groups: [string, string, string[]][] = [
    ['Sẽ nhận', `${e.expected} người nhận`, ['tran-minh@enterprise.vn', 'hoa.le@enterprise.vn']],
    ['Bị trừ ra', `${e.excluded + e.optedOut} người`, ['user:le-hoa · excluded', 'user-07 · opted_out']],
    ['Không có kênh active', `${e.noChannel + e.invalid} người`, ['legacy.user@enterprise.vn']],
  ]
  return (
    <div className="space-y-4">
      {!readOnly && (
        <Button variant="outline" onClick={() => setOpen(!open)}>
          <RefreshCw /> Giải người nhận (thử)
        </Button>
      )}
      {open && (
        <Panel glow className="space-y-5 p-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[.2em] text-[var(--starlight)]">resolution preview</p>
            <h3 className="mt-1 font-heading text-lg font-semibold">Pipeline bung người nhận</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              <span className="font-mono text-[var(--starlight)]">{topicKey}</span> · không lưu danh sách người
            </p>
          </div>

          {/* Orbital track — desktop */}
          <div className="relative hidden lg:block" aria-hidden>
            <svg viewBox="0 0 1000 140" className="h-36 w-full overflow-visible">
              <defs>
                <linearGradient id={`${uid}-track`} x1="0" x2="1">
                  <stop offset="0" stopColor="var(--starlight)" stopOpacity=".9" />
                  <stop offset="1" stopColor="var(--pulsar)" stopOpacity=".5" />
                </linearGradient>
              </defs>
              {NODE_X.slice(0, -1).map((_, i) => (
                <path key={i} d={segmentPath(i)} fill="none" stroke={`url(#${uid}-track)`} strokeWidth="1.5" strokeOpacity=".55" />
              ))}
              {/* Particle stream (SMIL animateMotion theo đúng path của track) — mật độ = số người còn lại
                  sau mỗi bước; không render khi prefers-reduced-motion */}
              {!reduced &&
                NODE_X.slice(0, -1).map((_, i) => (
                  <g key={`p-${i}`}>
                    <path id={`${uid}-seg-${i}`} d={segmentPath(i)} fill="none" stroke="none" />
                    {Array.from({ length: particlesFor(steps[i + 1].count, max) }).map((__, k) => (
                      <circle key={k} r="2.5" fill="var(--starlight)" opacity="0">
                        <animateMotion dur="2.4s" begin={`${(k * 0.4 + i * 0.15).toFixed(2)}s`} repeatCount="indefinite">
                          <mpath href={`#${uid}-seg-${i}`} />
                        </animateMotion>
                        <animate attributeName="opacity" values="0;.9;.9;0" keyTimes="0;.15;.85;1" dur="2.4s" begin={`${(k * 0.4 + i * 0.15).toFixed(2)}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                  </g>
                ))}
              {NODE_X.map((x, i) => (
                <g key={i}>
                  <circle cx={x} cy={NODE_Y[i]} r="14" fill="var(--deep)" stroke="var(--starlight)" strokeOpacity=".5" />
                  <circle cx={x} cy={NODE_Y[i]} r="4" fill="var(--starlight)" />
                  <text x={x} y={NODE_Y[i] + 34} textAnchor="middle" fill="var(--text-primary)" fontSize="15" fontFamily="var(--next-font-mono), ui-monospace, monospace" fontWeight="600">
                    {steps[i].count} {steps[i].unit}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="hidden grid-cols-5 gap-3 lg:grid">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xs leading-5 text-[var(--text-secondary)]">
                  <span className="mr-1 font-mono text-[var(--text-muted)]">{i + 1}.</span>
                  {s.label}
                </p>
                {s.note && <p className="mt-1 font-mono text-[10px] tabular-nums text-[var(--text-muted)]">{s.note}</p>}
              </div>
            ))}
          </div>

          {/* Mobile / tablet: danh sách dọc */}
          <ol className="space-y-3 lg:hidden">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-[var(--starlight)]/20 bg-[var(--starlight)]/[.04] p-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--starlight)] shadow-[var(--glow-starlight)]" />
                <div>
                  <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                    {s.count} {s.unit}
                  </p>
                  <p className="text-xs leading-5 text-[var(--text-secondary)]">{s.label}</p>
                  {s.note && <p className="mt-1 font-mono text-[10px] tabular-nums text-[var(--text-muted)]">{s.note}</p>}
                </div>
              </li>
            ))}
          </ol>

          <div className="grid gap-2 md:grid-cols-3">
            {groups.map(([title, count, items]) => {
              const isOpen = lists[title]
              return (
                <div key={title} className="rounded-xl border border-[var(--orbit)] bg-[var(--void)]/40">
                  <Button variant="ghost" className="h-auto w-full justify-between p-3 text-left" onClick={() => setLists({ ...lists, [title]: !isOpen })}>
                    <span>
                      <span className="block text-xs text-[var(--text-secondary)]">{title}</span>
                      <span className="font-mono text-sm tabular-nums text-[var(--text-primary)]">{count}</span>
                    </span>
                    {isOpen ? <ChevronDown /> : <ChevronRight />}
                  </Button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-[var(--orbit)] p-3 text-xs">
                      {items.map((item) => (
                        <div key={item} className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[var(--text-secondary)]">{item}</span>
                          {title === 'Bị trừ ra' && <ReasonBadge reason={item.includes('excluded') ? 'excluded' : 'opted_out'} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className={cn('border-t border-[var(--orbit)] pt-3 text-xs text-[var(--text-muted)]')}>
            Đây là kết quả tại thời điểm bấm. Lúc gửi thật hệ thống chạy lại đúng 5 bước này.
          </p>
        </Panel>
      )}
    </div>
  )
}
