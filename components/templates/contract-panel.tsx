'use client'

import { ChevronRight, Copy } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TABLE_HEADER_CLASS } from '@/lib/theme'
import { V1_ERROR_CODES, v1ErrorText } from '@/lib/api/v1-errors'
import type { TemplateVariableDto } from '@/lib/api/types'
import { samplePayload } from '@/lib/template-syntax'
import { variableLabel } from '@/lib/variable-labels'

/** Mã lỗi chỉ gặp khi gửi bằng template — lấy từ bảng mã lỗi thật, không viết lại. */
const TEMPLATE_ERROR_CODES = new Set([
  'TEMPLATE_NOT_FOUND',
  'TEMPLATE_NOT_PUBLISHED',
  'TEMPLATE_ARCHIVED',
  'MISSING_VARIABLE',
  'INVALID_PAYLOAD_VALUE',
  'LINK_SCHEME_NOT_ALLOWED',
  'CONTENT_AND_TEMPLATE_CONFLICT',
])

/** Tiêu đề khối của tab Tích hợp (bản phác TichHop): một tiêu đề + một dòng giải thích đủ tương phản. */
export function ContractHeading({ title, hint, action }: { title: string; hint?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        {hint && <div className="text-xs leading-5 text-[var(--text-secondary)]">{hint}</div>}
      </div>
      {action}
    </div>
  )
}

const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>

/**
 * "App phải gửi kèm": tên dễ đọc người soạn thấy trên chip ↔ mã trong `payload` ↔ bắt buộc. Máy tính là bảng;
 * điện thoại là danh sách (mã nằm dưới tên) — bảng 3 cột ở 390px bị cắt mất cột "Bắt buộc".
 * `note` = dòng "theo bản xuất bản vN" / cảnh báo chưa xuất bản — bản xuất bản quyết định biến nào bắt buộc.
 */
export function ContractFields({ variables, note }: { variables: readonly TemplateVariableDto[]; note: React.ReactNode }) {
  const t = useTranslations('contract')
  const fields = variables.filter((v) => v.name.startsWith('payload.'))
  return (
    <Panel className="min-w-0 p-5" data-testid="contract-fields-card">
      <ContractHeading title={t('fieldsTitle')} hint={<><p>{t.rich('fieldsHint', { mono })}</p><p>{note}</p></>} />
      {fields.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)]" data-testid="contract-no-fields">{t('noFields')}</p>
      ) : (
        <>
          <Table className="hidden text-[13px] sm:table" data-testid="contract-fields">
            <TableHeader className={TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-2">{t('colLabel')}</TableHead>
                <TableHead className="px-2">{t('colKey')}</TableHead>
                <TableHead className="px-2 text-right">{t('colRequired')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((v) => (
                <TableRow key={v.name} className="h-11">
                  <TableCell className="whitespace-normal px-2">{variableLabel(v)}</TableCell>
                  <TableCell className="px-2 font-mono text-xs">{v.name}</TableCell>
                  <TableCell className="px-2 text-right">{v.required ? t('yes') : t('no')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ul className="divide-y divide-[var(--orbit)] sm:hidden" data-testid="contract-fields-list">
            {fields.map((v) => (
              <li key={v.name} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[var(--text-primary)]">{variableLabel(v)}</p>
                  <p className="break-all font-mono text-xs text-[var(--text-secondary)]">{v.name}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-secondary)]">{v.required ? t('required') : t('optional')}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

/**
 * Lời gọi mẫu: sao đúng `POST /v1/notifications` của backend (`templateId` + `payload`, ADR-0020) — giữ
 * `idempotencyKey` (thiếu nó app gửi lại là trùng thư). Nút "Sao chép" có chữ ở đầu khối (bản phác); điện thoại
 * xuống dòng thay vì cắt mép phải.
 */
export function ContractRequest({ templateId, variables }: { templateId: string; variables: readonly TemplateVariableDto[] }) {
  const t = useTranslations('contract')
  const tc = useTranslations('common')
  const request = `POST /v1/notifications
Authorization: Bearer <${t('apiKey')}>
Content-Type: application/json

${JSON.stringify(
    {
      to: { externalId: `<${t('recipientId')}>` },
      topic: `<${t('topic')}>`,
      templateId,
      payload: samplePayload(variables),
      idempotencyKey: `<${t('eventId')}>-<${t('recipientId')}>`,
    },
    null,
    2,
  )}`
  return (
    <Panel className="min-w-0 p-5" data-testid="contract-panel">
      <ContractHeading
        title={t('sampleCall')}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(request)
              toast.success(tc('copied'))
            }}
            data-testid="contract-copy-request"
          >
            <Copy />
            {tc('copy')}
          </Button>
        }
      />
      <pre className="whitespace-pre-wrap break-all rounded-lg border border-[var(--orbit)] bg-[var(--void)] p-4 font-mono text-xs leading-6 text-[var(--starlight)] sm:overflow-x-auto sm:whitespace-pre sm:break-normal">
        {request}
      </pre>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{t.rich('envNote', { mono })}</p>
    </Panel>
  )
}

/** Lỗi thường gặp — thu gọn sẵn (bản phác); mỗi dòng nói ý nghĩa + cách xử lý trước, mã lỗi nhỏ màu trung tính sau. */
export function ContractErrors() {
  const t = useTranslations('contract')
  const locale = useLocale()
  const errors = V1_ERROR_CODES.filter((e) => TEMPLATE_ERROR_CODES.has(e.code))
  return (
    <Panel className="min-w-0 p-0">
      <Collapsible>
        <CollapsibleTrigger
          className="group/errors flex min-h-11 w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold text-[var(--text-primary)]"
          data-testid="contract-errors-toggle"
        >
          <ChevronRight className="size-4 shrink-0 text-[var(--text-secondary)] transition-transform group-data-[panel-open]/errors:rotate-90" aria-hidden="true" />
          <span className="flex-1">{t('commonErrors')}</span>
          <span className="text-xs font-normal text-[var(--text-secondary)]">{errors.length}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="divide-y divide-[var(--orbit)] border-t border-[var(--orbit)] px-5" data-testid="contract-errors">
            {errors.map((e) => {
              const text = v1ErrorText(e, locale)
              return (
                <li key={e.code} className="space-y-0.5 py-3">
                  <p className="text-[13px] text-[var(--text-primary)]">{text.meaning}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{text.action}</p>
                  <p className="break-all font-mono text-[11px] text-[var(--text-secondary)]">
                    {e.status} {e.code}
                  </p>
                </li>
              )
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </Panel>
  )
}
