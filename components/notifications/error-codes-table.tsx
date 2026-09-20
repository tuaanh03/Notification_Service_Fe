'use client'
import { Info, ShieldAlert } from 'lucide-react'
import { DataTable, type Column } from '@/components/data-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { apiErrorCodes, type ApiErrorCode } from '@/lib/mock-data'

type Row = ApiErrorCode & Record<string, unknown>
const columns: Column<Row>[] = [
  { key: 'code', label: 'Mã', mono: true, render: (r) => <span className="font-mono tabular-nums">{r.code}</span> },
  { key: 'error', label: 'error code', mono: true },
  { key: 'meaning', label: 'Nghĩa' },
  { key: 'action', label: 'App nên làm gì' },
]

/** 07 §D — bảng mã lỗi + 2 callout (retry policy, privacy: chỉ trả con số). */
export function ErrorCodesTable() {
  return (
    <div className="space-y-4">
      <DataTable<Row> columns={columns} rows={apiErrorCodes as Row[]} filterKey="code" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]" data-testid="callout-retry">
          <Info />
          <AlertTitle className="text-[var(--solar)]">Retry policy</AlertTitle>
          <AlertDescription className="text-[var(--text-secondary)]">
            <span className="font-mono">4xx</span> thì đừng retry (trừ <span className="font-mono">429</span>) — gọi lại vẫn sai như
            thế. <span className="font-mono">5xx</span> và timeout thì retry có backoff và giữ nguyên{' '}
            <span className="font-mono">Idempotency-Key</span>.
          </AlertDescription>
        </Alert>
        <Alert className="border-[var(--starlight)]/30 bg-[var(--starlight)]/[.06]" data-testid="callout-privacy">
          <ShieldAlert />
          <AlertTitle className="text-[var(--starlight)]">Phản hồi API chỉ trả CON SỐ</AlertTitle>
          <AlertDescription className="text-[var(--text-secondary)]">
            Không trả danh tính người nhận. App biết &quot;43 người nhận&quot;, không biết là những ai.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
