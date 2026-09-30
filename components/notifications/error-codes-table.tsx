'use client'
import { Info, RotateCcw } from 'lucide-react'
import { DataTable, type Column } from '@/components/data-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { V1_ERROR_CODES, type V1ErrorCode } from '@/lib/api/v1-errors'

type Row = V1ErrorCode & Record<string, unknown>
const columns: Column<Row>[] = [
  { key: 'status', label: 'HTTP', mono: true, render: (r) => <span className="font-mono tabular-nums">{r.status}</span> },
  { key: 'code', label: 'Mã', mono: true },
  { key: 'where', label: 'Ở đâu', render: (r) => <span className="text-xs">{r.where}</span> },
  { key: 'meaning', label: 'Nghĩa' },
  { key: 'action', label: 'App nên làm gì' },
]

/**
 * 07 §D — bảng mã lỗi `/v1` cho đội app tích hợp. Nguồn: `lib/api/v1-errors.ts` (sao đúng backend).
 *
 * Bản v0 từng dạy mã không tồn tại (`token_expired`, `rate_limited`…) và header `Idempotency-Key` —
 * backend không có bước đổi token, chưa trả 429, và khoá chống trùng là trường `idempotencyKey` trong
 * body. Lỗi thiếu biến của template nay có thật, tên là `MISSING_VARIABLE` (ADR-0020).
 */
export function ErrorCodesTable() {
  return (
    <div className="space-y-4">
      <Alert>
        <Info />
        <AlertTitle>Đọc lỗi theo <span className="font-mono">code</span>, không theo câu chữ</AlertTitle>
        <AlertDescription className="text-[var(--text-secondary)]">
          Mọi lỗi là <span className="font-mono">application/problem+json</span>. Với <span className="font-mono">422</span>,{' '}
          <span className="font-mono">code</span> ở ngoài chỉ là <span className="font-mono">VALIDATION</span> — mã cụ thể nằm
          trong <span className="font-mono">issues[].code</span>, kèm <span className="font-mono">path</span> chỉ trường sai.
        </AlertDescription>
      </Alert>

      <DataTable<Row> columns={columns} rows={V1_ERROR_CODES as Row[]} filterKey="status" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Alert className="bg-[var(--solar)]/10" data-testid="callout-retry">
          <RotateCcw className="text-[var(--solar)]" />
          <AlertTitle>Thử lại khi nào</AlertTitle>
          <AlertDescription className="text-[var(--text-secondary)]">
            <span className="font-mono">4xx</span>: không thử lại nguyên xi — gọi lại vẫn sai như thế.{' '}
            <span className="font-mono">5xx</span> và hết thời gian chờ: thử lại có giãn cách, giữ nguyên trường{' '}
            <span className="font-mono">idempotencyKey</span> trong body — cùng khoá thì không gửi lần hai. MVP chưa trả{' '}
            <span className="font-mono">429</span>.
          </AlertDescription>
        </Alert>
        {/* UC-005 BR-3: callout này không được bỏ. */}
        <Alert className="bg-[var(--starlight)]/10" data-testid="callout-accepted">
          <Info className="text-[var(--starlight)]" />
          <AlertTitle>
            <span className="font-mono">202</span> = đã nhận, chưa gửi
          </AlertTitle>
          <AlertDescription className="text-[var(--text-secondary)]">
            Thư đi sau, trong hàng đợi. Theo dõi bằng <span className="font-mono">GET /v1/notifications/:id</span>. Kể cả{' '}
            <span className="font-mono">sent</span> cũng chỉ là máy chủ thư đã nhận, chưa chắc đã vào hộp thư.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
