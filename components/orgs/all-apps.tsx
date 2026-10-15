'use client'

import { LayoutGrid, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { appKey } from '@/lib/app-routes'
import type { App } from '@/lib/mock-data'
import { useAppSelection } from '@/components/app-context'
import { AppLink, useAppRouter } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useRole } from '@/components/role-context'
import { StatusPill, useStatusLabel } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { useChooseAppParams } from './choose-app-notice'

/**
 * `/orgs/apps` — mọi app người đăng nhập thấy, gom từ mọi org (danh sách đã lọc theo vai ở backend,
 * nạp sẵn ở `app/layout.tsx`). Bấm một dòng -> mở app đó, giống `<OrgApps>`.
 */
export function AllApps() {
  const t = useTranslations('orgs')
  const statusLabel = useStatusLabel()
  const router = useAppRouter()
  const { creatableOrgs } = useRole()
  const { apps } = useAppSelection()
  const { next } = useChooseAppParams()

  // Owner / Org Admin của ít nhất một org (hoặc Super Admin) mới tạo app được.
  const createButton =
    creatableOrgs.length > 0 ? (
      // Vẽ thành link -> báo Base UI đây không phải <button> thật.
      <Button render={<AppLink href="/apps/new" />} nativeButton={false}>
        <Plus />
        {t('createApp')}
      </Button>
    ) : undefined
  const rows = [...apps].sort(
    (a, b) => (a.org_name ?? '').localeCompare(b.org_name ?? '') || a.name.localeCompare(b.name),
  )
  const columns: Column<App>[] = [
    { key: 'name', label: t('colAppName'), render: (a) => <span className="font-medium">{a.name}</span> },
    { key: 'slug', label: 'slug', mono: true },
    { key: 'org_name', label: t('colOrg'), render: (a) => a.org_name ?? '—' },
    { key: 'status', label: t('colStatus'), render: (a) => <StatusPill status={a.status} /> },
  ]

  return (
    <>
      <PageHeader title={t('navAllApps')} subtitle={t('allAppsSubtitle')} actions={createButton} />
      <DataTable<App>
        columns={columns}
        rows={rows}
        filterKey="status"
        chipLabel={statusLabel}
        onRowClick={(a) => router.push(next, { app: appKey(a) })}
        empty={<EmptyState icon={LayoutGrid} title={t('allAppsEmptyTitle')} description={t('allAppsEmptyBody')} action={createButton} />}
      />
    </>
  )
}
