'use client'

import { useLocale, useTranslations } from 'next-intl'
import { CodeBlock } from '@/components/code-block'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { V1_ERROR_CODES, v1ErrorText } from '@/lib/api/v1-errors'
import type { TemplateVariableDto } from '@/lib/api/types'
import { samplePayload } from '@/lib/template-syntax'

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
 */
export function ContractPanel({ templateId, variables }: { templateId: string; variables: readonly TemplateVariableDto[] }) {
  const t = useTranslations('contract')
  const locale = useLocale()
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const required = variables.filter((v) => v.required && v.name.startsWith('payload.'))
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{t('requiredVars')}</span>
        {required.length === 0 && <span className="text-xs text-[var(--text-muted)]">{t('noneRequired')}</span>}
        {required.map((v) => (
          <Badge key={v.name} variant="outline" className="font-mono text-[10px] text-[var(--starlight)]">
            {v.name.slice('payload.'.length)}
          </Badge>
        ))}
      </div>
      <Tabs defaultValue="request">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="request">{t('sampleCall')}</TabsTrigger>
          <TabsTrigger value="errors">{t('commonErrors')}</TabsTrigger>
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
