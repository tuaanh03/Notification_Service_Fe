/**
 * Chỉ nhận đường dẫn NỘI BỘ từ `?next=`. Không kiểm thì `?next=https://kẻ-xấu` biến trang đăng
 * nhập thành bàn đạp chuyển hướng sang site khác — lừa được người dùng vì link xuất phát từ
 * đúng domain thật.
 *
 * Dùng ở cả form đăng nhập (client) và trang callback Microsoft (server) nên không `server-only`.
 */
export function safeNext(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return '/'
  return raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/'
}
