'use client'
import { ExternalLink } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { CodeBlock } from '@/components/code-block'
import { toLocale } from '@/i18n/locales'
import type { IncomingHookDto, IncomingIntegrationDto } from '@/lib/api/types'

/**
 * Cách cài một công cụ giám sát vào hook (ADR-0043 của backend): các bước (chữ backend đã dịch vi / en) + body dán vào
 * công cụ `custom` (`setupBody` — backend dựng, console không tự dựng). Công cụ `fixed` tự gửi JSON nên chỉ có các bước.
 */
export function IntegrationSetup({ hook, integration }: { hook: IncomingHookDto; integration: IncomingIntegrationDto }) {
  const t = useTranslations('incoming')
  const locale = toLocale(useLocale())
  const steps = integration.steps[locale] ?? integration.steps.en
  return (
    <div className="space-y-3 text-xs">
      {steps.length > 0 && (
        <ol className="list-decimal space-y-1 pl-5 text-[var(--text-secondary)]">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
      {/* Link chi tiết phải https (backend chặn LINK_SCHEME_NOT_ALLOWED) — Grafana / Alertmanager nội bộ hay chạy http. */}
      {integration.fields.some((f) => f.variable === 'detail_url') && (
        <p className="text-[var(--solar)]">{t('detailUrlHttps')}</p>
      )}
      {integration.payload === 'custom' &&
        (hook.setupBody ? (
          <CodeBlock language="json" value={JSON.stringify(hook.setupBody, null, 2)} />
        ) : (
          <p className="text-[var(--text-muted)]">{t('guideUnpublished')}</p>
        ))}
      {integration.docsUrl && (
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-6 items-center gap-1 text-[var(--starlight)] hover:underline max-md:min-h-11"
        >
          {t('toolDocs', { tool: integration.name })} <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}
