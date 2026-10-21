import { PlugZap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { AuditLogPage } from '@/components/admin/audit-log-page'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { searchAudit } from '@/lib/api/audit'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'
import { actionsOf, fromOf, isAuditGroup, isAuditRange } from '@/lib/audit-groups'

/**
 * Nhật ký hoạt động (`GET /admin/audit/events` của backend) — chỉ Super Admin. `?group=` / `?range=` để màn khác dẫn
 * sang đã lọc sẵn (vd "Theo dõi & Bảo mật" -> `?group=security&range=24h`). Trang đầu đọc ở server, trang sau qua action.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const group = isAuditGroup(params.group) ? params.group : 'admin'
  const range = isAuditRange(params.range) ? params.range : '7d'
  try {
    const first = await searchAudit({ actions: actionsOf(group), from: fromOf(range, Date.now()), limit: 50 })
    return <AuditLogPage key={`${group}:${range}`} initialGroup={group} initialRange={range} initialPage={first} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    const t = await getTranslations('auditLog')
    return (
      <>
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={t('loadFailed')} description={await describeError(err)} />
        </Panel>
      </>
    )
  }
}
