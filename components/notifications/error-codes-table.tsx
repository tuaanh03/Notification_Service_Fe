'use client'
import { Info, RotateCcw } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { DataTable, type Column } from '@/components/data-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { V1_ERROR_CODES, v1ErrorText, type V1ErrorCode } from '@/lib/api/v1-errors'

type Row = V1ErrorCode & Record<string, unknown>

/**
 * 07 §D — bảng mã lỗi `/v1` cho đội app tích hợp. Nguồn: `lib/api/v1-errors.ts` (sao đúng backend).
 *
 * Bản v0 từng dạy mã không tồn tại (`token_expired`, `rate_limited`…) và header `Idempotency-Key` —
 * backend không có bước đổi token, chưa trả 429, và khoá chống trùng là trường `idempotencyKey` trong
 * body. Lỗi thiếu biến của template nay có thật, tên là `MISSING_VARIABLE` (ADR-0020).
 */
export function ErrorCodesTable() {
  const t = useTranslations('errorCodes')
  const locale = useLocale()
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const text = (r: Row) => v1ErrorText(r, locale)
  const columns: Column<Row>[] = [
    { key: 'status', label: 'HTTP', mono: true, render: (r) => <span className="font-mono tabular-nums">{r.status}</span> },
    { key: 'code', label: t('colCode'), mono: true },
    { key: 'where', label: t('colWhere'), render: (r) => <span className="text-xs">{text(r).where}</span> },
    { key: 'meaning', label: t('colMeaning'), render: (r) => text(r).meaning },
    { key: 'action', label: t('colAction'), render: (r) => text(r).action },
  ]
  return (
    <div className="space-y-4">
      <Alert>
        <Info />
        <AlertTitle>{t.rich('byCodeTitle', { mono })}</AlertTitle>
        <AlertDescription className="text-[var(--text-secondary)]">{t.rich('byCodeBody', { mono })}</AlertDescription>
      </Alert>

      <DataTable<Row> columns={columns} rows={V1_ERROR_CODES as Row[]} filterKey="status" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Alert className="bg-[var(--solar)]/10" data-testid="callout-retry">
          <RotateCcw className="text-[var(--solar)]" />
          <AlertTitle>{t('retryTitle')}</AlertTitle>
          <AlertDescription className="text-[var(--text-secondary)]">{t.rich('retryBody', { mono })}</AlertDescription>
        </Alert>
        {/* UC-005 BR-3: callout này không được bỏ. */}
        <Alert className="bg-[var(--starlight)]/10" data-testid="callout-accepted">
          <Info className="text-[var(--starlight)]" />
          <AlertTitle>{t.rich('acceptedTitle', { mono })}</AlertTitle>
          <AlertDescription className="text-[var(--text-secondary)]">{t.rich('acceptedBody', { mono })}</AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
