import { NextResponse, type NextRequest } from 'next/server'

/**
 * Chặn mọi trang khi chưa có cookie phiên, trừ trang đăng nhập và trang Microsoft gọi về sau khi
 * đăng nhập M365 (lúc đó CHƯA có phiên — chính trang ấy tạo ra phiên).
 *
 * Đây CHỈ là lớp chặn sớm cho đỡ nhấp nháy: nó xem cookie có mặt hay không, KHÔNG kiểm token
 * còn hiệu lực — middleware chạy ở edge runtime, gọi backend ở đây là thêm một lượt mạng cho
 * mọi request. Chốt thật nằm ở backend: mỗi lời gọi `/admin/*` đều xác thực phiên, và
 * `app/layout.tsx` đưa người dùng về đây khi backend trả 401.
 *
 * Nói cách khác: cookie giả chỉ lừa được middleware, không lừa được một dòng dữ liệu nào.
 */
const SESSION_COOKIE = 'ews_session'
const LOGIN_PATH = '/login'
/** Trùng `M365_CALLBACK_PATH` ở `lib/api/auth.ts` — file đó `server-only`, middleware không import được. */
const PUBLIC_PATHS = new Set([LOGIN_PATH, '/auth/callback/microsoft'])
/**
 * Layout là server component nên KHÔNG đọc được đường dẫn. Middleware gắn nó vào header để
 * `app/layout.tsx` biết đang dựng trang đăng nhập — nếu không, lúc phiên hỏng nó sẽ chuyển
 * hướng về `/login` ngay trên chính `/login`, thành vòng lặp.
 */
export const PATHNAME_HEADER = 'x-ews-pathname'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const signedIn = request.cookies.has(SESSION_COOKIE)

  if (!signedIn && !PUBLIC_PATHS.has(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.search = ''
    // Nhớ nơi định tới để đăng nhập xong quay lại đúng chỗ.
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  const headers = new Headers(request.headers)
  headers.set(PATHNAME_HEADER, pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  /**
   * Bỏ qua tài nguyên tĩnh và route handler nội bộ:
   * - `api/*`      tự lo phần xác thực của mình
   * - `_next/*`    bundle và ảnh tối ưu
   * - file có đuôi (icon.png, logo-icon.png…) nằm ngay ở `public/`
   */
  matcher: ['/((?!api|_next/static|_next/image|.*\\.[^/]+$).*)'],
}
