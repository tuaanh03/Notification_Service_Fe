'use client'
import { Copy, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { ContractErrors, ContractFields, ContractHeading, ContractRequest } from './contract-panel'

/**
 * Tab "Tích hợp cho đội app" (UX-6, bản phác TichHop): hai cột từ `lg` — trái là THÔNG TIN (mã template, biến app
 * phải gửi), phải là THỨ ĐỂ CHÉP (lời gọi mẫu, lỗi thường gặp thu gọn); điện thoại một cột theo đúng thứ tự đó.
 * Dành cho người hiểu kỹ thuật — được giữ thuật ngữ (`templateId`, `payload`, mã lỗi), tách khỏi luồng soạn thư.
 */
export function IntegrationTab({ ed, onCopyId }: { ed: TemplateEditorState; onCopyId: () => void }) {
  const t = useTranslations('templateEditor')
  const tc = useTranslations('common')
  const detail = ed.detail
  if (!detail) return null
  const variables = ed.published?.variables ?? ed.variables
  const note = ed.published ? (
    <span data-testid="contract-version">{t('byPublished', { version: ed.published.version })}</span>
  ) : (
    <span className="font-medium text-[var(--text-primary)]" data-testid="contract-version">
      <TriangleAlert className="mr-1 inline size-3.5 -translate-y-px text-[var(--solar)]" aria-hidden="true" />
      {t('notPublished')}
    </span>
  )
  return (
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2" data-testid="integration-tab">
      <div className="min-w-0 space-y-5">
        <Panel className="min-w-0 p-5">
          <ContractHeading title={t('id')} hint={t('idHint')} />
          <div className="flex min-w-0 gap-2">
            <code
              className="flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-[var(--orbit)] bg-[var(--void)] px-3 font-mono text-xs text-[var(--text-primary)]"
              data-testid="template-id"
            >
              {detail.id}
            </code>
            <Button variant="outline" onClick={onCopyId} data-testid="template-id-copy">
              <Copy />
              {tc('copy')}
            </Button>
          </div>
        </Panel>
        <ContractFields variables={variables} note={note} />
      </div>
      <div className="min-w-0 space-y-5">
        <ContractRequest templateId={detail.id} variables={variables} />
        <ContractErrors />
      </div>
    </div>
  )
}
