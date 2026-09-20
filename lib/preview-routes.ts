/**
 * Màn nào ĐÃ đọc dữ liệu thật của backend qua `lib/api/*`.
 *
 * Liệt kê theo chiều NGƯỢC là có chủ đích: mọi route không nằm trong danh sách này đều bị coi là
 * bản xem trước và bị dán nhãn (`<PreviewBanner>`). Màn mới dựng sẽ mặc định "chưa thật" cho tới
 * khi ai đó chủ động thêm vào đây — quên thì sai về phía an toàn, thay vì im lặng hiện số giả.
 *
 * Đây là NƠI DUY NHẤT giữ danh sách này. Đấu xong một màn thì thêm một dòng, không sửa chỗ khác.
 */
export const WIRED_ROUTES = ['/admin/apps', '/apps/new', '/topics', '/settings/credentials'] as const

/**
 * Đã đấu nhưng CHỈ chính nó — route con vẫn là bản xem trước.
 *
 * `/users` đọc dữ liệu thật, nhưng `/users/[id]` và `/users/import` thì chưa: backend không có
 * đường nào cho nhập CSV, và chi tiết một người đã nằm ngay trong `/users`.
 */
export const WIRED_EXACT_ROUTES = ['/users'] as const

/** Khớp cả route con (`/topics/order_updates`), không khớp route chỉ trùng tiền tố chữ. */
export function isPreviewRoute(pathname: string): boolean {
  if (WIRED_EXACT_ROUTES.some((route) => pathname === route)) return false
  return !WIRED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
