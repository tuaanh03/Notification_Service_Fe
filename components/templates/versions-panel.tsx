'use client'
import { useState } from 'react'
import { GitCompare, History, Pencil } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import type { TemplateVersion } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

/** 05 §C — timeline dọc kiểu orbit trail; published sáng cyan, superseded mờ, draft rỗng gạch đứt. */
export function VersionsPanel({ ed, onEditPublished }: { ed: TemplateEditorState; onEditPublished: () => void }) {
  const [diff, setDiff] = useState<TemplateVersion | null>(null)
  const [rollback, setRollback] = useState<TemplateVersion | null>(null)
  const sorted = [...ed.history].sort((a, b) => Number(a.version.slice(1)) - Number(b.version.slice(1)))
  const prevOf = (v: TemplateVersion) => sorted[sorted.findIndex((x) => x.version === v.version) - 1]
  return (
    <div className="space-y-3" data-testid="versions-panel">
      <ol className="relative ml-3 border-l border-[var(--orbit)] pl-5">
        {sorted.map((v) => (
          <li key={v.version} className="relative pb-4 last:pb-0" data-version={v.version} data-status={v.status}>
            <span
              className={cn(
                'absolute -left-[27px] top-1 size-3.5 rounded-full border-2',
                v.status === 'published' && 'border-[var(--starlight)] bg-[var(--starlight)] shadow-[var(--glow-starlight)]',
                v.status === 'superseded' && 'border-[var(--text-muted)] bg-[var(--deep)] opacity-60',
                v.status === 'draft' && 'border-dashed border-[var(--pulsar)] bg-transparent',
              )}
            />
            <div className={cn('flex flex-wrap items-center gap-2 text-xs', v.status === 'superseded' && 'opacity-60')}>
              <span className="font-mono text-sm text-[var(--text-primary)]">{v.version}</span>
              <StatusPill status={v.status} />
              <span className="text-[var(--text-secondary)]">{v.by}</span>
              <span className="font-mono tabular-nums text-[var(--text-muted)]">{v.at}</span>
              <span className="font-mono text-[var(--text-muted)]">{v.diff}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Button variant="ghost" size="xs" onClick={() => setDiff(v)}><GitCompare /> Xem diff</Button>
              {v.status === 'superseded' && (
                <Button variant="ghost" size="xs" onClick={() => setRollback(v)}><History /> Quay về version này</Button>
              )}
              {v.status === 'published' && ed.status !== 'draft' && (
                <Button variant="ghost" size="xs" onClick={onEditPublished}><Pencil /> Sửa</Button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <Dialog open={diff !== null} onOpenChange={(o) => !o && setDiff(null)}>
        <DialogContent className="z-[100] max-w-4xl rounded-2xl p-6 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Diff {diff && prevOf(diff) ? `${prevOf(diff)!.version} → ${diff.version}` : diff?.version}</DialogTitle>
            <DialogDescription>Subject + Body HTML cạnh nhau.</DialogDescription>
          </DialogHeader>
          {diff && (
            <div className="grid gap-3 md:grid-cols-2" data-testid="diff-view">
              {[prevOf(diff) ?? { version: '—', subject: '', html: '' }, diff].map((v, i) => (
                <div key={i} className="min-w-0 space-y-1">
                  <p className="font-mono text-xs text-[var(--text-muted)]">{v.version}</p>
                  <pre className="overflow-x-auto rounded-lg border border-[var(--orbit)] bg-[var(--void)] p-3 font-mono text-xs leading-5 text-[var(--text-primary)]">{`Subject: ${v.subject}\n\n${v.html}`}</pre>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={rollback !== null}
        title={`Quay về ${rollback?.version}?`}
        description="Version hiện tại bị đánh dấu superseded nhưng KHÔNG bị xoá — delivery log cũ vẫn trỏ tới nó. Ghi audit template_rolled_back."
        facts={rollback ? [['version', rollback.version], ['xuất bản bởi', rollback.by], ['ngày', rollback.at]] : []}
        confirmLabel={`Quay về ${rollback?.version}`}
        onConfirm={() => { if (rollback) ed.rollback(rollback); setRollback(null) }}
        onCancel={() => setRollback(null)}
      />
    </div>
  )
}
