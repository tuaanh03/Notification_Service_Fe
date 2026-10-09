'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight, LayoutGrid, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { readLastApp } from './app-context'
import { AppLink } from './app-link'
import { CosmicBackground } from './cosmic-background'
import { Panel } from './panel'
import { useRole } from './role-context'
import { StatusPill } from './status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { BRAND_LOGO_SRC } from '@/lib/brand'
import { appKey, ORG_PARAM } from '@/lib/app-routes'
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
      app={appKey(app)}
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

/** Bỏ `?org=` khỏi đường dẫn, giữ tham số khác. */
function withoutOrgParam(href: string): string {
  const at = href.indexOf('?')
  if (at === -1) return href
  const params = new URLSearchParams(href.slice(at + 1))
  params.delete(ORG_PARAM)
  const rest = params.toString()
  return rest ? `${href.slice(0, at)}?${rest}` : href.slice(0, at)
}

/** Gom app theo org, giữ thứ tự đã sắp bên trong mỗi nhóm; nhóm theo tên org. */
function groupByOrg(apps: App[]): { orgId: string | undefined; orgName: string | undefined; apps: App[] }[] {
  const groups = new Map<string | undefined, { orgId: string | undefined; orgName: string | undefined; apps: App[] }>()
  for (const a of apps) {
    const group = groups.get(a.org_id) ?? { orgId: a.org_id, orgName: a.org_name, apps: [] }
    group.apps.push(a)
    groups.set(a.org_id, group)
  }
  return [...groups.values()].sort((x, y) => (x.orgName ?? '').localeCompare(y.orgName ?? ''))
}

/**
 * Trang chọn app — hiện TẠI đường dẫn đang mở khi đường dẫn thiếu hoặc sai `?app=` (`<AppGate>`).
 * Chọn xong là tới đúng màn đã định mở (`here` + `?app=`), không về trang đầu.
 *
 * Không đoán thay người dùng: "dùng gần nhất" chỉ là nhãn. Danh sách đã lọc theo vai ở backend
 * (ADR-0022): chỉ app người này được xem, của mọi org họ thuộc về — nhiều org thì chia nhóm theo org.
 * Chỉ hiện trường backend đang trả — không có số người nhận / số thư tự chế.
 *
 * `?org=` (ô chuyển org dẫn tới): chỉ hiện app của org đó, kèm lối "xem tất cả org". Tham số này
 * bị bỏ khỏi link của thẻ app — mở app rồi thì nó hết nghĩa.
 */
export function AppChooser({ apps, requested, here }: { apps: App[]; requested: string | null; here: string }) {
  const t = useTranslations('chooser')
  const locale = useLocale()
  const { isSuperAdmin } = useRole()
  const [query, setQuery] = useState('')
  const orgFilter = useSearchParams().get(ORG_PARAM)
  const inOrg = orgFilter === null ? [] : apps.filter((a) => a.org_id === orgFilter)
  // Org lạ (gõ tay, hoặc vừa mất quyền) thì bỏ lọc — không hiện trang trống không lý do.
  const scoped = inOrg.length > 0 ? inOrg : apps
  const filtering = inOrg.length > 0
  const target = withoutOrgParam(here)
  // Đọc sau khi mount: server không có localStorage, đọc lúc render là lệch hydrate.
  const [last, setLast] = useState<string | null>(null)
  useEffect(() => setLast(readLastApp()), [])

  const q = query.trim().toLowerCase()
  const shown = scoped
    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.slug.includes(q))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, locale))
  const live = shown.filter((a) => a.status !== 'revoked')
  const multiOrg = new Set(scoped.map((a) => a.org_id)).size > 1
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

          {filtering && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)]">
                {t.rich('orgFilter', {
                  org: inOrg[0]?.org_name ?? '',
                  b: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
                })}
              </span>
              <AppLink href={target} app={null} className="flex items-center gap-1 text-[var(--starlight)] underline-offset-2 hover:underline">
                <LayoutGrid className="size-3.5" />
                {t('allOrgs')}
              </AppLink>
            </div>
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
            <div className="space-y-4">
              {groupByOrg(live).map((group) => (
                <section key={group.orgId ?? '-'} className="space-y-2">
                  {multiOrg && <h2 className="text-xs font-semibold text-[var(--text-secondary)]">{group.orgName}</h2>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.apps.map((a) => (
                      <AppCard key={a.app_id} app={a} here={target} last={appKey(a) === last} />
                    ))}
                  </div>
                </section>
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
                    <AppCard key={a.app_id} app={a} here={target} last={appKey(a) === last} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Panel>

        {/* Duyệt / tạm ngưng / thu hồi app là việc của Super Admin (ADR-0022). */}
        {isSuperAdmin && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="size-3.5" />
            {t('adminHint')}{' '}
            <AppLink href="/admin/apps" className="text-[var(--starlight)] underline-offset-2 hover:underline">
              {t('adminLink')}
            </AppLink>
          </p>
        )}
      </div>
    </>
  )
}
