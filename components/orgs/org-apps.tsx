'use client'

import { LayoutGrid } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { consoleOrgs } from '@/lib/access'
import { appKey } from '@/lib/app-routes'
import type { App } from '@/lib/mock-data'
import { useAppSelection } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useRole } from '@/components/role-context'
import { StatusPill } from '@/components/status-pill'

/**
 * `/orgs/<orgId>` — app của một org mà người đăng nhập thấy (danh sách đã lọc theo vai ở backend).
 * Bấm một dòng -> mở app đó ở console app. Org không thấy được (gõ tay, mất quyền) -> báo không có.
 */
export function OrgApps({ orgId }: { orgId: string }) {
  const t = useTranslations('orgs')
  const router = useAppRouter()
  const { me } = useRole()
  const { apps } = useAppSelection()
  const org = consoleOrgs(me).find((o) => o.id === orgId) ?? null

  if (!org) {
    return <EmptyState icon={LayoutGrid} title={t('notFoundTitle')} description={t('notFoundBody')} />
  }

  const rows = apps.filter((a) => a.org_id === orgId).sort((a, b) => a.name.localeCompare(b.name))
  const columns: Column<App>[] = [
    { key: 'name', label: t('colAppName'), render: (a) => <span className="font-medium">{a.name}</span> },
    { key: 'slug', label: 'slug', mono: true },
    { key: 'status', label: t('colStatus'), render: (a) => <StatusPill status={a.status} /> },
  ]

  return (
    <>
      <PageHeader title={org.name} subtitle={t('appsSubtitle')} />
      <DataTable<App>
        columns={columns}
        rows={rows}
        filterKey="status"
        onRowClick={(a) => router.push('/', { app: appKey(a) })}
        empty={<EmptyState icon={LayoutGrid} title={t('noAppsTitle')} description={t('noAppsBody')} />}
      />
    </>
  )
}
