'use client'
import { useState } from 'react'
import { CopyPlus, GitCompare } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import type { TemplateVersionDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

/**
 * Lịch sử phiên bản — timeline dọc, mới nhất trên cùng; published sáng, superseded mờ, draft viền gạch.
 * Không có "quay về" tại chỗ: backend không xuất bản lại bản cũ. "Tạo nháp từ bản này" chép nội dung
 * sang nháp mới, người soạn xem lại rồi tự Xuất bản — bản cũ giữ nguyên vì lịch sử gửi trỏ tới nó.
 */
export function VersionsPanel({ ed }: { ed: TemplateEditorState }) {
  const t = useTranslations('versions')
  const [diff, setDiff] = useState<TemplateVersionDto | null>(null)
  const [copyFrom, setCopyFrom] = useState<TemplateVersionDto | null>(null)
  const versions = ed.detail?.versions ?? []
  const prevOf = (v: TemplateVersionDto) => versions.find((x) => x.version < v.version)
  const canCopy = !ed.draft && !ed.archived

  return (
    <div className="space-y-3" data-testid="versions-panel">
      <ol className="relative ml-3 border-l border-[var(--orbit)] pl-5">
        {versions.map((v) => (
          <li key={v.id} className="relative pb-4 last:pb-0" data-version={v.version} data-status={v.status}>
            <span
              className={cn(
                'absolute -left-[27px] top-1 size-3.5 rounded-full border-2',
                v.status === 'published' && 'border-[var(--starlight)] bg-[var(--starlight)] shadow-[var(--glow-starlight)]',
                v.status === 'superseded' && 'border-[var(--text-muted)] bg-[var(--deep)] opacity-60',
                v.status === 'draft' && 'border-dashed border-[var(--pulsar)] bg-transparent',
              )}
            />
            <div className={cn('flex flex-wrap items-center gap-2 text-xs', v.status === 'superseded' && 'opacity-60')}>
              <span className="font-mono text-sm text-[var(--text-primary)]">v{v.version}</span>
              <StatusPill status={v.status} />
              <span className="font-mono tabular-nums text-[var(--text-muted)]">
                {v.publishedAt ? t('publishedAt', { at: fmtDateTime(v.publishedAt) }) : t('editedAt', { at: fmtDateTime(v.updatedAt) })}
              </span>
              <span className="font-mono text-[var(--text-muted)]">{t('varCount', { count: v.variables.length })}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {prevOf(v) && (
                <Button variant="ghost" size="xs" onClick={() => setDiff(v)}>
                  <GitCompare /> {t('compareWith', { version: prevOf(v)!.version })}
                </Button>
              )}
              {v.status !== 'draft' && canCopy && (
                <Button variant="ghost" size="xs" onClick={() => setCopyFrom(v)} disabled={ed.pending}>
                  <CopyPlus /> {t('draftFromThis')}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!canCopy && ed.draft && (
        <p className="text-xs text-[var(--text-muted)]">{t('draftExists', { version: ed.draft.version })}</p>
      )}

      <Dialog open={diff !== null} onOpenChange={(o) => !o && setDiff(null)}>
        <DialogContent className="z-[100] max-w-4xl grid-cols-[minmax(0,1fr)] rounded-2xl p-6 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {diff && prevOf(diff) ? `v${prevOf(diff)!.version} → v${diff.version}` : ''}
            </DialogTitle>
            <DialogDescription>{t('diffBody')}</DialogDescription>
          </DialogHeader>
          {diff && (
            <div className="grid gap-3 md:grid-cols-2" data-testid="diff-view">
              {[prevOf(diff), diff].map((v, i) => (
                <div key={i} className="min-w-0 space-y-1">
                  <p className="font-mono text-xs text-[var(--text-muted)]">{v ? `v${v.version}` : '—'}</p>
                  <pre className="max-h-[60vh] overflow-auto rounded-lg border border-[var(--orbit)] bg-[var(--void)] p-3 font-mono text-xs leading-5 text-[var(--text-primary)]">
                    {v ? `Subject: ${v.subject}\n\n${v.html}` : ''}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={copyFrom !== null}
        title={t('copyTitle', { version: copyFrom?.version ?? '' })}
        description={t('copyBody')}
        facts={
          copyFrom
            ? [
                [t('factFrom'), `v${copyFrom.version}`],
                [t('factStatus'), copyFrom.status],
                [t('factVars'), String(copyFrom.variables.length)],
              ]
            : []
        }
        confirmLabel={t('copyConfirm', { version: copyFrom?.version ?? '' })}
        onConfirm={() => {
          if (copyFrom) void ed.draftFrom(copyFrom.version)
          setCopyFrom(null)
        }}
        onCancel={() => setCopyFrom(null)}
      />
    </div>
  )
}
