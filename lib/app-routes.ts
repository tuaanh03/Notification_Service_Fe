/**
 * App nằm TRÊN ĐƯỜNG DẪN (`?app=<app_id>`) — nguồn duy nhất cho câu hỏi "đang xem app nào".
 *
 * Giữ app trong state client thì tải lại / mở tab mới / gửi link cho đồng nghiệp đều rơi về app
 * khác mà màn hình không báo gì. Đường dẫn thiếu app thì BẮT CHỌN (`<AppGate>`), không đoán.
 *
 * Đây là NƠI DUY NHẤT giữ luật đường dẫn theo app. Link nội bộ dựng bằng `<AppLink>` /
 * `useAppRouter()` (`components/app-link.tsx`), không ghép `?app=` bằng tay.
 */

export const APP_PARAM = 'app'

/**
 * Màn KHÔNG thuộc app nào — vào thẳng, không bắt chọn app: đăng ký app mới (`/apps/new`). Liệt kê
 * theo chiều này là có chủ đích: route mới mặc định CẦN app — quên khai báo thì bị bắt chọn app,
 * sai về phía an toàn. `/admin/*` không nằm ở đây: đó là khu riêng (`isAdminRoute`).
 */
export const ORG_ROUTES = ['/apps'] as const

export function isOrgRoute(pathname: string): boolean {
  return ORG_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Khu Quản trị EWS — chỉ Super Admin (ADR-0022 của backend). Khung riêng (`<AdminShell>`), không
 * thuộc app nào, không cần `?app=`. Người khác mở vào nhận 404 (`app/admin/layout.tsx`).
 */
export const ADMIN_AREA = '/admin'
export const ADMIN_HOME = '/admin/apps'

export function isAdminRoute(pathname: string): boolean {
  return pathname === ADMIN_AREA || pathname.startsWith(`${ADMIN_AREA}/`)
}

/**
 * Trang Tổ chức (`/orgs`: danh sách org; `/orgs/<orgId>`: app của một org). Không thuộc app nào,
 * không cần `?app=`, khung riêng (`<OrgsShell>`). Mở được cả khi org chưa có app.
 */
export const ORGS_HOME = '/orgs'

export function isOrgsRoute(pathname: string): boolean {
  return pathname === ORGS_HOME || pathname.startsWith(`${ORGS_HOME}/`)
}

export function orgPath(orgId: string): string {
  return `${ORGS_HOME}/${encodeURIComponent(orgId)}`
}

/** Màn Thành viên của một org (ADR-0026 của backend). */
export function orgMembersPath(orgId: string): string {
  return `${orgPath(orgId)}/members`
}

/**
 * Màn vào được khi tổ chức CHƯA có app nào — chỉ đúng một màn: đăng ký app đầu tiên.
 *
 * Danh sách này gỡ thế bí con gà/quả trứng: mọi lối vào wizard (`/admin/apps`, `/settings`, ô
 * chọn app) đều nằm trong `<AppShell>`, mà shell chỉ dựng khi đã có ít nhất một app. Không có
 * ngoại lệ này thì org mới tạo không có đường nào tạo app đầu tiên qua giao diện.
 *
 * Cố ý KHÔNG mở cả `/admin`: các màn đó đọc dữ liệu theo app, chưa có app thì không có gì để xem.
 */
export const BOOTSTRAP_ROUTES = ['/apps/new'] as const

export function isBootstrapRoute(pathname: string): boolean {
  return BOOTSTRAP_ROUTES.some((route) => pathname === route)
}

/**
 * Trang chi tiết `[id]` ngay dưới một màn danh sách. Đổi app khi đang ở đây thì về danh sách:
 * cùng mã ở app khác là thứ khác. `static` = route tĩnh cùng cấp, KHÔNG phải trang chi tiết.
 */
export const APP_DETAIL_ROUTES: ReadonlyArray<{ base: string; static: readonly string[] }> = [
  { base: '/users', static: ['/users/import'] },
  { base: '/templates', static: ['/templates/new'] },
  { base: '/notifications', static: ['/notifications/errors'] },
]

/**
 * Giá trị `?app=` của một app — LUÔN đi qua hàm này. Là `app_id`: không trùng giữa các org, không
 * bao giờ đổi, nên link gửi cho ai cũng mở đúng app. Không dùng slug — slug chỉ duy nhất trong
 * MỘT org, hai org trùng slug thì cùng một link mở ra app khác nhau tuỳ người xem.
 */
export function appKey(app: { app_id: string }): string {
  return app.app_id
}

/** Gắn `?app=` vào một đường dẫn nội bộ, giữ các tham số khác. `key = null`, link ngoài, khu Quản trị EWS hoặc `/orgs` -> để nguyên. */
export function withApp(href: string, key: string | null): string {
  if (key === null || !href.startsWith('/')) return href
  const hashAt = href.indexOf('#')
  const hash = hashAt === -1 ? '' : href.slice(hashAt)
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt)
  const queryAt = beforeHash.indexOf('?')
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt)
  // Khu Quản trị EWS và trang Tổ chức không thuộc app nào: link tới đó không mang `?app=`.
  if (isAdminRoute(path) || isOrgsRoute(path)) return href
  const params = new URLSearchParams(queryAt === -1 ? '' : beforeHash.slice(queryAt + 1))
  params.set(APP_PARAM, key)
  return `${path}?${params.toString()}${hash}`
}

/**
 * Đổi app thì đi đâu: ở lại màn đang xem, hoặc về danh sách nếu đang ở trang chi tiết. Trả
 * đường dẫn KHÔNG kèm tham số nào — bộ lọc của app cũ (`?externalId=`) không có nghĩa ở app mới.
 */
export function switchAppPath(pathname: string): string {
  const detail = APP_DETAIL_ROUTES.find(
    (route) => pathname.startsWith(`${route.base}/`) && !route.static.includes(pathname),
  )
  return detail ? detail.base : pathname
}
