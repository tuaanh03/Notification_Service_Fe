/**
 * App nằm TRÊN ĐƯỜNG DẪN (`?app=<slug>`) — nguồn duy nhất cho câu hỏi "đang xem app nào".
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

/** Giá trị `?app=` của một app — LUÔN đi qua hàm này, không đọc thẳng `slug`. */
export function appKey(app: { slug: string; route_key?: string | undefined }): string {
  return app.route_key ?? app.slug
}

/**
 * Slug chỉ duy nhất trong MỘT org (`uq_apps_org_slug` của backend). Một người thấy app của nhiều
 * org thì hai app có thể trùng slug — khi đó `?app=` thêm 8 ký tự đầu của id để không mở nhầm app.
 * App không trùng giữ slug trơn: link cũ vẫn chạy.
 */
export function appRouteKeys(apps: readonly { app_id: string; slug: string }[]): Map<string, string> {
  const count = new Map<string, number>()
  for (const a of apps) count.set(a.slug, (count.get(a.slug) ?? 0) + 1)
  return new Map(apps.map((a) => [a.app_id, (count.get(a.slug) ?? 0) > 1 ? `${a.slug}~${a.app_id.slice(0, 8)}` : a.slug]))
}

/** Gắn `?app=` vào một đường dẫn nội bộ, giữ các tham số khác. `slug = null`, link ngoài hoặc khu Quản trị EWS -> để nguyên. */
export function withApp(href: string, slug: string | null): string {
  if (slug === null || !href.startsWith('/')) return href
  const hashAt = href.indexOf('#')
  const hash = hashAt === -1 ? '' : href.slice(hashAt)
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt)
  const queryAt = beforeHash.indexOf('?')
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt)
  // Khu Quản trị EWS không thuộc app nào: link tới đó không mang `?app=`.
  if (isAdminRoute(path)) return href
  const params = new URLSearchParams(queryAt === -1 ? '' : beforeHash.slice(queryAt + 1))
  params.set(APP_PARAM, slug)
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
