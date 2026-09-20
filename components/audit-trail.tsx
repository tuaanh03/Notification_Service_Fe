import { ArrowRight } from 'lucide-react'
import { SourceBadge } from './source-badge'
import type { AuditEntry } from '@/lib/mock-data'
export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="space-y-4">
      {entries.map((e, i) => (
        <div key={i} className="relative flex gap-3">
          <div className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--starlight)]/40 bg-[var(--deep)]">
            <i className="size-1.5 rounded-full bg-[var(--starlight)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-[var(--text-primary)]">{e.actor}</span>
              <span className="text-[var(--text-secondary)]">{e.action}</span>
              {e.from && (
                <span className="font-mono text-[var(--text-muted)]">
                  {e.from}
                  <ArrowRight className="mx-1 inline size-3" />
                  {e.to}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <span>{e.timestamp}</span>
              <SourceBadge source={e.source} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
