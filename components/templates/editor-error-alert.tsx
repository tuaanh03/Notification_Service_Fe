'use client'
import { FileWarning } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { EditorError } from '@/hooks/use-template-editor'
import { useIssueText } from './issue-text'

/** Lỗi của lệnh ghi trên màn soạn. Xuất bản bị 422 thì liệt kê TỪNG vi phạm, kèm biến / ô bị sai. */
export function EditorErrorAlert({ error }: { error: EditorError }) {
  const t = useTranslations('templateEditor')
  const issueText = useIssueText()
  return (
    <Alert variant="destructive" className="bg-[var(--supernova)]/10" data-testid="editor-error">
      <FileWarning />
      <AlertTitle>{error.issues.length ? t('publishFailed', { count: error.issues.length }) : error.message}</AlertTitle>
      <AlertDescription>
        {error.issues.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-xs">
            {error.issues.map((issue, i) => (
              <li key={i}>
                {issue.path && <span className="font-mono">{issue.path}: </span>}
                {issueText(issue)}{' '}
                {/* Bộ kiểm HTML (ADR-0036 / 0038): chi tiết của backend chỉ đúng chỗ sai (vd thẻ <script>) — giữ nguyên văn. */}
                {issue.code.startsWith('HTML_') && issue.message && (
                  <span className="font-mono text-[var(--text-muted)]">— {issue.message} </span>
                )}
                <span className="font-mono text-[var(--text-muted)]">({issue.code})</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="font-mono text-xs">{t('code', { code: error.code })}</span>
        )}
      </AlertDescription>
    </Alert>
  )
}
