import { PlugZap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { AppAdminList } from '@/components/app-admin-list'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { listApps } from '@/lib/api/apps'
import { getMe } from '@/lib/api/me'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'

/**
 * Server Component: đọc `/admin/apps` của MỌI org mà người đăng nhập thấy (`/admin/me`) bằng phiên
 * phía server rồi truyền xuống bảng. Browser không thấy token, cũng không biết địa chỉ backend.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const me = await getMe()
    const apps = (await Promise.all(me.orgs.map((o) => listApps(o.id)))).flat()
    return <AppAdminList rows={apps} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    const t = await getTranslations('allApps')
    // Backend chết / sai cấu hình là chuyện vận hành, không phải crash màn hình:
    // hiện đúng lý do để người trực biết phải sửa ở đâu.
    return (
      <>
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel className="overflow-hidden">
          <EmptyState
            icon={PlugZap}
            title={t('loadFailed')}
            description={await describeError(err)}
          />
        </Panel>
      </>
    )
  }
}
