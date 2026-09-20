import { PlugZap } from 'lucide-react'
import { AppAdminList } from '@/components/app-admin-list'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { listApps } from '@/lib/api/apps'
import { ApiError, messageOf } from '@/lib/api/problem'

/**
 * Server Component: đọc `/admin/apps` bằng ADMIN_TOKEN phía server rồi truyền
 * dữ liệu xuống bảng. Browser không thấy token, cũng không biết địa chỉ backend.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const apps = await listApps()
    return <AppAdminList rows={apps} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    // Backend chết / sai cấu hình là chuyện vận hành, không phải crash màn hình:
    // hiện đúng lý do để người trực biết phải sửa ở đâu.
    return (
      <>
        <PageHeader title="Tất cả app" subtitle="Quản lý đăng ký publisher và quyền gửi trong EWS Tổng" />
        <Panel className="overflow-hidden">
          <EmptyState
            icon={PlugZap}
            title="Không đọc được dữ liệu từ API"
            description={`${messageOf(err)} (mã: ${err.code})`}
          />
        </Panel>
      </>
    )
  }
}
