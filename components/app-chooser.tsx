'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { readLastApp } from './app-context'
import { AppLink } from './app-link'
import { CosmicBackground } from './cosmic-background'
import { Panel } from './panel'
import { StatusPill } from './status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { BRAND_LOGO_SRC } from '@/lib/brand'
import type { App, AppStatus } from '@/lib/mock-data'

/** App đang chạy lên đầu; app đã thu hồi gom riêng ở cuối. */
const STATUS_ORDER: Readonly<Record<AppStatus, number>> = {
  active: 0,
  pending_approval: 1,
  draft: 2,
  suspended: 3,
  revoked: 4,
}

function AppCard({ app, here, last }: { app: App; here: string; last: boolean }) {
  const t = useTranslations('chooser')
  return (
    <AppLink
      href={here}
      app={app.slug}
      className="block rounded-xl border border-[var(--orbit)] bg-[var(--void)]/60 p-4 transition-colors hover:border-[var(--starlight)]/50 hover:bg-[var(--void)]/90"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{app.name}</p>
          <p className="truncate font-mono text-xs text-[var(--text-secondary)]">{app.slug}</p>
        </div>
        <StatusPill status={app.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <span>{app.origin === 'internal' ? t('internal') : t('external')}</span>
        {last && (
          <Badge variant="outline" className="text-[10px]">
            {t('lastUsed')}
          </Badge>
        )}
      </div>
    </AppLink>
  )
}

/**
 * Trang chọn app — hiện TẠI đường dẫn đang mở khi đường dẫn thiếu hoặc sai `?app=` (`<AppGate>`).
 * Chọn xong là tới đúng màn đã định mở (`here` + `?app=`), không về trang đầu.
 *
 * Không đoán thay người dùng: "dùng gần nhất" chỉ là nhãn. Chưa có đăng nhập nên liệt kê mọi app
 * của tổ chức; lọc theo vai trò làm ở đây khi có RBAC (plan §12.4 của backend).
 * Chỉ hiện trường backend đang trả — không có số người nhận / số thư tự chế.
 */
export function AppChooser({ apps, requested, here }: { apps: App[]; requested: string | null; here: string }) {
  const t = useTranslations('chooser')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  // Đọc sau khi mount: server không có localStorage, đọc lúc render là lệch hydrate.
  const [last, setLast] = useState<string | null>(null)
  useEffect(() => setLast(readLastApp()), [])

  const q = query.trim().toLowerCase()
  const shown = apps
    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.slug.includes(q))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, locale))
  const live = shown.filter((a) => a.status !== 'revoked')
  const revoked = shown.filter((a) => a.status === 'revoked')

  return (
    <>
      <CosmicBackground />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <img src={BRAND_LOGO_SRC} alt="" className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-semibold">{t('title')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{t('subtitle')}</p>
          </div>
        </div>

        <Panel className="space-y-5 p-5">
          {requested !== null && (
            <Alert className="bg-[var(--solar)]/10">
              <TriangleAlert className="text-[var(--solar)]" />
              <AlertDescription>
                {t.rich('notFound', {
                  slug: requested,
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                })}
              </AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-8"
              aria-label={t('searchLabel')}
            />
          </div>

          {live.length === 0 && revoked.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--text-muted)]">{t('noMatch', { query })}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {live.map((a) => (
                <AppCard key={a.slug} app={a} here={here} last={a.slug === last} />
              ))}
            </div>
          )}

          {revoked.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="group/revoked flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-foreground">
                <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]/revoked:rotate-90" />
                {t('revoked', { count: revoked.length })}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {revoked.map((a) => (
                    <AppCard key={a.slug} app={a} here={here} last={a.slug === last} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Panel>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <ShieldCheck className="size-3.5" />
          {t('adminHint')}{' '}
          <AppLink href="/admin/apps" className="text-[var(--starlight)] underline-offset-2 hover:underline">
            {t('adminLink')}
          </AppLink>
        </p>
      </div>
    </>
  )
}
