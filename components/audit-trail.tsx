'use client'

import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { tOr } from '@/i18n/dynamic'
import { SourceBadge } from './source-badge'
import { useStatusLabel } from './status-pill'
import type { AuditEntry } from '@/lib/mock-data'
export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  // `action` là tên event backend (`AppApproved`…) -> câu theo ngôn ngữ; event chưa có câu dịch
  // (hoặc chữ mock) thì hiện nguyên.
  const t = useTranslations('auditActions')
  // `from` / `to` thường là trạng thái (`pending_approval` -> `active`) — dịch được thì dịch, còn lại (hint khoá, IP) giữ nguyên.
  const statusLabel = useStatusLabel()
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
              <span className="text-[var(--text-secondary)]">{tOr(t, e.action)}</span>
              {/* Thêm / cấp chỉ có `to`, gỡ / thu hồi chỉ có `from` — vẫn phải hiện giá trị đó. */}
              {(e.from || e.to) && (
                <span className="font-mono text-[var(--text-muted)]">
                  {e.from && statusLabel(e.from)}
                  {e.from && e.to && <ArrowRight className="mx-1 inline size-3" />}
                  {e.to && statusLabel(e.to)}
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
