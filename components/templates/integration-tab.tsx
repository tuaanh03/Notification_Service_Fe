'use client'
import { Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { ContractPanel } from './contract-panel'

/**
 * Tab "Tích hợp cho đội app": mã template + hợp đồng gửi (`<ContractPanel>`). Dành cho người hiểu kỹ thuật —
 * được giữ thuật ngữ (`templateId`, `payload`, mã lỗi), tách khỏi luồng soạn thư.
 */
export function IntegrationTab({ ed, onCopyId }: { ed: TemplateEditorState; onCopyId: () => void }) {
  const t = useTranslations('templateEditor')
  const detail = ed.detail
  if (!detail) return null
  return (
    <div className="space-y-5" data-testid="integration-tab">
      <Panel className="min-w-0 space-y-2 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('id')}</h2>
        <p className="text-xs text-[var(--text-muted)]">{t('idHint')}</p>
        <Button variant="outline" className="w-full max-w-md justify-between font-mono text-xs" onClick={onCopyId} data-testid="template-id">
          <span className="truncate">{detail.id}</span>
          <Copy />
        </Button>
      </Panel>
      <Panel className="min-w-0 p-5">
        <h2 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{t('sendWith')}</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {ed.published ? t('byPublished', { version: ed.published.version }) : t('notPublished')}
        </p>
        <ContractPanel templateId={detail.id} variables={ed.published?.variables ?? ed.variables} />
      </Panel>
    </div>
  )
}
