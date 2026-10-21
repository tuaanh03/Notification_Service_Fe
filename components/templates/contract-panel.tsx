'use client'

import { useLocale, useTranslations } from 'next-intl'
import { CodeBlock } from '@/components/code-block'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { V1_ERROR_CODES, v1ErrorText } from '@/lib/api/v1-errors'
import type { TemplateVariableDto } from '@/lib/api/types'
import { samplePayload } from '@/lib/template-syntax'
import { variableLabel } from '@/lib/variable-labels'
import { UNDERLINE_TAB_LIST, UNDERLINE_TAB_TRIGGER } from './tab-styles'

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

/**
 * Hợp đồng cho đội app: gửi template này thế nào. Sao đúng `POST /v1/notifications` của backend
 * (`templateId` + `payload`, ADR-0020) — bản xuất bản quyết định biến nào bắt buộc.
 * Bảng "App phải gửi kèm" (bản phác TichHop): tên dễ đọc người soạn thấy trên chip ↔ mã trong `payload`.
 */
export function ContractPanel({ templateId, variables }: { templateId: string; variables: readonly TemplateVariableDto[] }) {
  const t = useTranslations('contract')
  const locale = useLocale()
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const fields = variables.filter((v) => v.name.startsWith('payload.'))
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
    <div className="space-y-3" data-testid="contract-panel">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">{t('fieldsTitle')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{t.rich('fieldsHint', { mono })}</p>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]" data-testid="contract-no-fields">{t('noFields')}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-[13px]" data-testid="contract-fields">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-2">{t('colLabel')}</TableHead>
                <TableHead className="px-2">{t('colKey')}</TableHead>
                <TableHead className="px-2">{t('colRequired')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((v) => (
                <TableRow key={v.name} className="h-11">
                  <TableCell className="px-2">{variableLabel(v)}</TableCell>
                  <TableCell className="px-2 font-mono text-xs">{v.name}</TableCell>
                  <TableCell className="px-2">{v.required ? t('yes') : t('no')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Tabs defaultValue="request">
        <TabsList variant="line" className={UNDERLINE_TAB_LIST}>
          <TabsTrigger value="request" className={UNDERLINE_TAB_TRIGGER}>{t('sampleCall')}</TabsTrigger>
          <TabsTrigger value="errors" className={UNDERLINE_TAB_TRIGGER}>{t('commonErrors')}</TabsTrigger>
        </TabsList>
        <TabsContent value="request" className="min-w-0 space-y-2">
          <CodeBlock language="http" value={request} />
          <p className="text-xs text-[var(--text-muted)]">{t.rich('envNote', { mono })}</p>
        </TabsContent>
        <TabsContent value="errors" className="min-w-0 space-y-2">
          {V1_ERROR_CODES.filter((e) => TEMPLATE_ERROR_CODES.has(e.code)).map((e) => (
            <div key={e.code} className="rounded-lg border border-[var(--orbit)] p-2">
              <p className="font-mono text-xs text-[var(--supernova)]">
                {e.status} {e.code}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {v1ErrorText(e, locale).meaning} — {v1ErrorText(e, locale).action}
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
