/**
 * Màn nào ĐÃ đọc dữ liệu thật của backend qua `lib/api/*`.
 *
 * Liệt kê theo chiều NGƯỢC là có chủ đích: mọi route không nằm trong danh sách này đều bị coi là
 * bản xem trước và bị dán nhãn (`<PreviewBanner>`). Màn mới dựng sẽ mặc định "chưa thật" cho tới
 * khi ai đó chủ động thêm vào đây — quên thì sai về phía an toàn, thay vì im lặng hiện số giả.
 *
 * Đây là NƠI DUY NHẤT giữ danh sách này. Đấu xong một màn thì thêm một dòng, không sửa chỗ khác.
 */
export const WIRED_ROUTES = ['/admin/apps', '/apps/new', '/topics', '/templates', '/settings/credentials', '/settings/origins'] as const

/**
 * Đã đấu nhưng CHỈ chính nó — route con vẫn là bản xem trước.
 *
 * `/users` đọc dữ liệu thật, `/users/import` thì chưa: backend không có đường nào cho nhập CSV.
 * Trang chi tiết `/users/[id]` đã đấu — nằm ở `WIRED_DETAIL_ROUTES` bên dưới.
 *
 * `/notifications` cũng vậy: `/notifications/[id]` (chi tiết đã nằm trong panel của chính màn
 * danh sách) vẫn là bản mẫu.
 *
 * `/` (Tổng quan) chỉ khớp đúng chính nó — để trong `WIRED_ROUTES` thì mọi route đều là "route con" của `/`.
 *
 * `/notifications/errors` không gọi API nhưng vẫn là số thật: bảng mã lỗi là hợp đồng tĩnh, sao
 * đúng backend (`lib/api/v1-errors.ts`).
 */
export const WIRED_EXACT_ROUTES = ['/', '/users', '/notifications', '/notifications/errors'] as const

/**
 * Đã đấu trang chi tiết `[id]` NGAY DƯỚI route này — đúng một đoạn đường dẫn, không sâu hơn.
 *
 * `preview` là route tĩnh cùng cấp vẫn là hàng mẫu: Next ưu tiên route tĩnh, nên `/users/import`
 * không phải trang chi tiết của người có mã `import`. Thiếu dòng đó là gỡ nhãn khỏi màn mẫu.
 */
export const WIRED_DETAIL_ROUTES = [{ base: '/users', preview: ['/users/import'] }] as const

/** Khớp cả route con (`/topics/order_updates`), không khớp route chỉ trùng tiền tố chữ. */
export function isPreviewRoute(pathname: string): boolean {
  if (WIRED_EXACT_ROUTES.some((route) => pathname === route)) return false
  if (
    WIRED_DETAIL_ROUTES.some(
      ({ base, preview }) =>
        pathname.startsWith(`${base}/`) &&
        !pathname.slice(base.length + 1).includes('/') &&
        !(preview as readonly string[]).includes(pathname),
    )
  )
    return false
  return !WIRED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
