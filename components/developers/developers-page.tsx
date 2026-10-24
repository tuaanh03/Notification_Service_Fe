'use client'
import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowRight, Download, KeyRound, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AppLink } from '@/components/app-link'
import { InfoHint } from '@/components/info-hint'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ACCOUNT_TOKENS } from '@/lib/app-routes'
import { apiBaseOf, groupOperations, matchesQuery, type OpenApiDoc } from '@/lib/openapi'
import { cn } from '@/lib/utils'
import { OperationCard } from './operation-card'

/**
 * Trang API cho lập trình viên (ADR-0042 của backend): spec OpenAPI nhóm theo tag, ô tìm, mỗi route một thẻ mở tại chỗ.
 * Chữ trong spec (summary / description) là tiếng Anh như error message — không dịch. Không có "Thử gọi" (cần CORS ở
 * backend) — mỗi route có lệnh curl để chép.
 */
export function DevelopersPage({ spec }: { spec: OpenApiDoc }) {
  const t = useTranslations('developers')
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const groups = useMemo(() => groupOperations(spec), [spec])
  const shown = useMemo(
    () => groups.map((g) => ({ ...g, operations: g.operations.filter((o) => matchesQuery(o, deferred)) })).filter((g) => g.operations.length > 0),
    [groups, deferred],
  )
  const total = groups.reduce((n, g) => n + g.operations.length, 0)
  const base = apiBaseOf(spec)

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'openapi.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button variant="outline" onClick={download}>
            <Download /> openapi.json
          </Button>
        }
      />

      <Panel className="mb-6 p-5" ring>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold">{t('authTitle')}</h2>
            <InfoHint label={t('authTitle')} summary={t('authInfo')} />
          </div>
          <AppLink
            href={ACCOUNT_TOKENS}
            className="inline-flex min-h-6 items-center gap-1 text-xs text-[var(--starlight)] hover:underline max-md:min-h-11"
          >
            <KeyRound className="size-3.5" /> {t('toTokens')} <ArrowRight className="size-3" />
          </AppLink>
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[max-content_minmax(0,1fr)]">
          <dt className="text-[var(--text-secondary)]">{t('baseUrl')}</dt>
          <dd className="break-all font-mono">{base}</dd>
          <dt className="font-mono text-[var(--text-secondary)]">/admin</dt>
          <dd className="break-all font-mono">Authorization: Bearer ewspat_…</dd>
          <dt className="font-mono text-[var(--text-secondary)]">/v1</dt>
          <dd className="break-all">
            <span className="font-mono">Authorization: Bearer ews_…</span>
            <span className="text-[var(--text-muted)]"> · {t('appKeyNote')}</span>
          </dd>
          <dt className="font-mono text-[var(--text-secondary)]">/hooks</dt>
          <dd className="text-[var(--text-muted)]">{t('hooksNote')}</dd>
        </dl>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label={t('groups')}>
          <ul className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-0.5 overflow-y-auto text-xs">
            {groups.map((g) => {
              const count = shown.find((s) => s.tag === g.tag)?.operations.length ?? 0
              return (
                <li key={g.tag}>
                  <a
                    href={`#tag-${g.tag}`}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 font-mono hover:bg-[var(--orbit)]/50',
                      count === 0 && 'pointer-events-none opacity-40',
                    )}
                  >
                    <span className="truncate">{g.tag}</span>
                    <span className="tabular-nums text-[var(--text-muted)]">{count}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-8">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="pl-9"
            />
          </div>
          <p className="-mt-6 text-[11px] text-[var(--text-muted)]">
            {t('count', { shown: shown.reduce((n, g) => n + g.operations.length, 0), total })}
          </p>

          {shown.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('noMatch')}</p>}

          {shown.map((g) => (
            <section key={g.tag} id={`tag-${g.tag}`} className="scroll-mt-20 space-y-2">
              <div>
                <h2 className="font-mono text-sm font-semibold">{g.tag}</h2>
                {g.description && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{g.description}</p>}
              </div>
              {g.operations.map((o) => (
                <OperationCard key={o.id} spec={spec} operation={o} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
