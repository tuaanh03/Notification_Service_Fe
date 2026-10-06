import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { finishMicrosoftSignIn, M365_CALLBACK_PATH, M365_STATE_COOKIE } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/problem'
import { safeNext } from '@/lib/safe-next'

/**
 * Microsoft đưa người dùng về đây sau khi đăng nhập (`M365_REDIRECT_URI` của backend trỏ đúng
 * đường này). Route handler, không phải trang: chỉ kiểm, đổi mã lấy phiên, rồi chuyển hướng.
 *
 * - `state` trên URL phải khớp cookie mà CHÍNH trình duyệt này nhận lúc bấm nút — không khớp là
 *   lượt đăng nhập do người khác khởi tạo, bỏ.
 * - Cookie `state` xoá ngay, thành công hay không: mỗi lượt dùng một lần.
 * - Lỗi thì về `/login?error=<MÃ>`; trang đăng nhập chỉ dịch mã, không hiện chữ nào lấy từ URL.
 * - `Location` là đường dẫn tương đối: sau proxy, `request.url` có thể là địa chỉ nội bộ của container.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams
  const jar = await cookies()
  const saved = parseSaved(jar.get(M365_STATE_COOKIE)?.value)
  jar.delete({ name: M365_STATE_COOKIE, path: M365_CALLBACK_PATH })

  // Người dùng bấm Huỷ / không đồng ý ở Microsoft, hoặc Microsoft báo lỗi cấu hình.
  const providerError = params.get('error')
  if (providerError !== null) return toLogin(providerError === 'access_denied' ? 'M365_CANCELLED' : 'M365_SIGN_IN_FAILED')

  const code = params.get('code')
  const state = params.get('state')
  if (code === null || state === null || saved === null || saved.state !== state) return toLogin('M365_STATE_INVALID')

  try {
    await finishMicrosoftSignIn(code, state)
  } catch (err) {
    return toLogin(err instanceof ApiError ? err.code : 'M365_SIGN_IN_FAILED')
  }
  return redirectTo(safeNext(saved.next))
}

function parseSaved(raw: string | undefined): { state: string; next: string } | null {
  if (raw === undefined) return null
  try {
    const value = JSON.parse(raw) as { state?: unknown; next?: unknown }
    return typeof value.state === 'string' ? { state: value.state, next: typeof value.next === 'string' ? value.next : '/' } : null
  } catch {
    return null
  }
}

const toLogin = (code: string) => redirectTo(`/login?error=${encodeURIComponent(code)}`)

/** 303: trình duyệt luôn mở trang đích bằng GET. */
const redirectTo = (path: string) => new Response(null, { status: 303, headers: { location: path, 'cache-control': 'no-store' } })
