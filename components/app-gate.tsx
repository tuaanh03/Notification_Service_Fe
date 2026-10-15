'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { appKey, chooseAppPath, isAdminRoute, isBootstrapRoute, isOrgRoute, isOrgsRoute } from '@/lib/app-routes'
import { AdminShell } from './admin-shell'
import { useAppSelection } from './app-context'
import { AppShell } from './app-shell'
import { useAppRouter } from './app-link'
import { CosmicBackground } from './cosmic-background'
import { NoAppsScreen } from './no-apps-screen'
import { OrgsShell } from './orgs-shell'
import { useRole } from './role-context'
import type { AdminDto } from '@/lib/api/auth'

/**
 * Cổng chặn giữa đường dẫn và màn hình (`lib/app-routes.ts`) — NƠI DUY NHẤT quyết định
 * đường dẫn này được dựng trong khung nào.
 *
 * - Khu Quản trị EWS (`/admin/*`) -> `<AdminShell>` với Super Admin, không cần app; người khác
 *   -> khung trần + trang 404 mà `app/admin/layout.tsx` đã dựng. Xét TRƯỚC mọi nhánh về app:
 *   Super Admin không thuộc org nào (0 app) vẫn phải vào được.
 * - Trang Tổ chức (`/orgs/*`) -> `<OrgsShell>`, không cần app (org chưa có app vẫn hiện).
 * - Chưa có app nào, đang ở màn đăng ký app đầu tiên -> khung trần + màn đó.
 * - Chưa có app nào (hoặc đọc `/admin/apps` hỏng) -> `<NoAppsScreen>`, mọi đường dẫn khác.
 * - Màn toàn tổ chức (`ORG_ROUTES`), hoặc có `?app=` hợp lệ -> `<AppShell>` + màn đó.
 * - Thiếu `?app=` và người này CHỈ thấy một app -> tự thêm (không có gì để chọn).
 * - Còn lại (thiếu hoặc sai `?app=`) -> chuyển sang trang Tổ chức chọn app (`chooseAppPath`), mang
 *   theo màn định mở (`?next=`) và giá trị sai (`?missing=`). Mọi app thuộc một org -> vào thẳng
 *   bảng app của org đó. Không có trang chọn app riêng: trang Tổ chức là cửa vào duy nhất.
 *
 * Chưa qua cổng thì màn con KHÔNG render: không có khoảnh khắc nào hiện dữ liệu của app sai.
 *
 * `<AppShell>` dựng ở ĐÂY chứ không ở `app/layout.tsx`. Layout là server component, không đọc
 * được đường dẫn, nên nếu nó tự quyết thì mọi đường dẫn phải chịu chung một câu trả lời — chính
 * chỗ đó từng nuốt luôn `/apps/new` và làm org mới không tạo được app nào.
 */
export function AppGate({
  children,
  error,
  admin,
}: {
  children: React.ReactNode
  error: string | null
  /** Admin đang đăng nhập — `<AppShell>` hiện ở chân sidebar. Layout đã chặn trường hợp null. */
  admin: AdminDto
}) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const router = useAppRouter()
  const { app, apps, requested } = useAppSelection()
  const { isSuperAdmin } = useRole()
  const adminArea = isAdminRoute(pathname)
  const orgsPage = isOrgsRoute(pathname)

  const open = isOrgRoute(pathname) || app !== null
  const only = !adminArea && !orgsPage && !open && requested === null && apps.length === 1 ? appKey(apps[0]) : null
  const here = search ? `${pathname}?${search}` : pathname
  const orgIds = new Set(apps.map((a) => a.org_id))
  const [onlyOrg] = orgIds
  const choose =
    !adminArea && !orgsPage && !open && only === null && apps.length > 0
      ? chooseAppPath(here, orgIds.size === 1 && onlyOrg !== undefined ? onlyOrg : null, requested)
      : null

  /**
   * Khung được CHỐT lúc bước vào đường dẫn, không tính lại giữa chừng.
   *
   * Tạo app đầu tiên xong là `apps` hết rỗng. Tính lại ngay lúc đó thì khung đổi từ khung trần
   * sang `<AppShell>`, React tháo cả cây cũ và dựng lại — wizard mất sạch state, người dùng đang
   * ở bước 4 bị ném về bước 1. Bước 4 là nơi DUY NHẤT hiện khoá API plaintext, mất là mất hẳn.
   *
   * Vì lý do đó khung chốt cũng thắng cả màn báo lỗi: `router.refresh()` sau khi tạo app mà gặp
   * API hỏng sẽ vừa làm `apps` rỗng vừa có `error` — cuốn màn hình đi lúc đó là cuốn luôn khoá
   * API. Lỗi vẫn hiện bình thường khi người dùng rời khỏi đường dẫn này.
   */
  const [bootstrapPath, setBootstrapPath] = useState<string | null>(null)
  const bootstrapping = apps.length === 0 && error === null && isBootstrapRoute(pathname)
  if (bootstrapping && bootstrapPath !== pathname) setBootstrapPath(pathname)
  else if (!bootstrapping && bootstrapPath !== null && bootstrapPath !== pathname) setBootstrapPath(null)

  // Mọi hook nằm TRÊN các nhánh return bên dưới: thứ tự hook phải giống nhau ở mọi lần render.
  useEffect(() => {
    if (only) router.replace(here, { app: only })
    else if (choose) router.replace(choose, { app: null })
  }, [only, choose, here, router])

  if (adminArea) {
    // API hỏng: nói ra lý do như mọi màn khác, không dựng khung với bảng trống.
    if (error !== null) return <NoAppsScreen error={error} />
    return isSuperAdmin ? <AdminShell admin={admin}>{children}</AdminShell> : <BootstrapFrame>{children}</BootstrapFrame>
  }
  if (orgsPage) return error !== null ? <NoAppsScreen error={error} /> : <OrgsShell admin={admin}>{children}</OrgsShell>
  if (bootstrapPath === pathname) return <BootstrapFrame>{children}</BootstrapFrame>
  // Rỗng vì API hỏng KHÁC rỗng vì chưa có gì — `<NoAppsScreen>` phân biệt bằng `error`.
  if (apps.length === 0) return <NoAppsScreen error={error} />

  if (open) return <AppShell admin={admin}>{children}</AppShell>
  // Đang chuyển (tự thêm `?app=` hoặc sang trang Tổ chức): không dựng màn nào của app.
  return null
}

/**
 * Khung cho màn chạy khi chưa có app nào. Không dùng `<AppShell>` vì shell có ô chọn app, vòng
 * quota và mọi link mang `?app=` — chưa có app thì những thứ đó rỗng hoặc dẫn đi đâu không rõ.
 */
function BootstrapFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CosmicBackground />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">{children}</main>
    </>
  )
}
