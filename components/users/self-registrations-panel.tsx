import { Panel } from '@/components/panel'
import { SourceBadge } from '@/components/source-badge'
import { Badge } from '@/components/ui/badge'
import { maskValue, selfRegistrations } from '@/lib/mock-data'

/** UC-002 §F (A2) — người dùng tự bấm Cho phép: chỉ rơi vào topic auto_subscribe, topic khác cần admin thêm binding. */
export function SelfRegistrationsPanel() {
  return (
    <Panel className="p-5" data-testid="self-registrations">
      <h2 className="text-sm font-semibold">Nguồn 1 — người dùng tự đăng ký</h2>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Subscription gần nhất có <span className="font-mono">source: self</span> và topic tự động vào (
        <span className="font-mono">auto_subscribe = true</span>).
      </p>
      <ul className="mt-4 divide-y divide-[var(--orbit)]">
        {selfRegistrations.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
            <span className="font-mono text-[var(--text-primary)]">{maskValue(s.channel, s.value)}</span>
            <SourceBadge source={s.source} />
            <span className="text-[var(--text-muted)]">→</span>
            {s.auto_topics.map((t) => (
              <Badge key={t} variant="outline" className="font-mono text-[10px]">
                {t}
              </Badge>
            ))}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--text-muted)]">Topic khác vẫn cần admin thêm binding — tự đăng ký không tự vào.</p>
    </Panel>
  )
}
