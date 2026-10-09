'use client'

import { Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { consoleOrgs } from '@/lib/access'
import { orgPath } from '@/lib/app-routes'
import { useAppSelection } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { useRole } from '@/components/role-context'

type OrgRow = { id: string; name: string; role: string; apps: number }

/**
 * `/orgs` — danh sách tổ chức của người đăng nhập (`consoleOrgs`: Super Admin mọi org, người khác
 * org mình là thành viên). Chỉ cột có dữ liệu thật: tên, vai của mình, số app mình thấy.
 * Bấm một dòng -> `/orgs/<orgId>` (app của org đó).
 */
export function OrgList() {
  const t = useTranslations('orgs')
  const tr = useTranslations('roles')
  const router = useAppRouter()
  const { me } = useRole()
  const { apps } = useAppSelection()

  const rows: OrgRow[] = consoleOrgs(me)
    .map((o) => ({
      id: o.id,
      name: o.name,
      // Super Admin ở org mình không là thành viên: không có vai org -> hiện "Super Admin".
      role: o.role ? tr(o.role) : tr('superAdmin'),
      apps: apps.filter((a) => a.org_id === o.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const columns: Column<OrgRow>[] = [
    { key: 'name', label: t('colName'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'role', label: t('colRole') },
    { key: 'apps', label: t('colApps'), numeric: true },
  ]

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <DataTable<OrgRow>
        columns={columns}
        rows={rows}
        onRowClick={(r) => router.push(orgPath(r.id))}
        empty={<EmptyState icon={Building2} title={t('emptyTitle')} description={t('emptyBody')} />}
      />
    </>
  )
}
