'use client'
import { Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CodeBlock } from '@/components/code-block'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { apiRequestFor, apiResponseFor, flappingSeries, type Notification } from '@/lib/mock-data'
import { cosmicTokens } from '@/lib/theme'

/** 07 §B5 — request/response cạnh nhau; callout 202 là thứ bị hiểu sai nhiều nhất (UC-005 BR-3). */
export function PayloadPanel({ notification: n }: { notification: Notification }) {
  const t = useTranslations('payload')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  return (
    <div className="space-y-4">
      {/* UC-005 BR-3 — không được bỏ */}
      <Alert className="border-[var(--starlight)]/40 bg-[var(--starlight)]/[.06]" data-testid="callout-202">
        <AlertTriangle />
        <AlertTitle className="text-[var(--starlight)]">
          {t.rich('acceptedTitle', { mono })}
        </AlertTitle>
        <AlertDescription className="text-[var(--text-secondary)]">
          {t.rich('acceptedBody', { mono })}
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-[var(--text-secondary)]">Request</p>
          <CodeBlock language="http" value={apiRequestFor(n)} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-[var(--text-secondary)]">Response</p>
          <CodeBlock language="http" value={apiResponseFor(n)} />
        </div>
      </div>
      {n.duplicate && (
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]" data-testid="explain-duplicate">
          <AlertDescription className="text-[var(--solar)]">
            {t.rich('duplicate', { mono, key: n.idempotency_key ?? 'alert-88213' })}
          </AlertDescription>
        </Alert>
      )}
      {n.collapsed && (
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]" data-testid="explain-collapsed">
          <AlertDescription className="text-[var(--solar)]">
            <p>
              {t('collapsed', { count: n.occurrence_count ?? 30 })}{' '}
              <span className="font-mono">occurrence_count = {n.occurrence_count ?? 30}</span>.
            </p>
            <div className="mt-2 h-10 w-full max-w-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flappingSeries(n)}>
                  <Line type="monotone" dataKey="count" stroke={cosmicTokens.solar} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <ChartTooltip
                    contentStyle={{ background: cosmicTokens.deep, border: `1px solid ${cosmicTokens.orbit}`, fontSize: 11 }}
                    labelFormatter={(t) => `+${t}s`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {n.stale_directory && (
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]" data-testid="explain-stale">
          <AlertDescription className="text-[var(--solar)]">{t('stale')}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
