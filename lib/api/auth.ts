import 'server-only'
import { cookies } from 'next/headers'
import { authFetch, sessionToken, SESSION_COOKIE } from './client'

/** Admin đang đăng nhập — hình dạng backend trả ở `/auth/login` và `/auth/me`. */
export interface AdminDto {
  id: string
  accountId: string
  email: string
  role: string
}

interface SignInDto {
  token: string
  expiresAt: string
  admin: AdminDto
}

/**
 * Đăng nhập rồi ĐẶT COOKIE. Token không bao giờ rời phía máy chủ Next:
 *
 * - `httpOnly`  — JavaScript trong trình duyệt không đọc được, nên XSS không lấy được phiên.
 * - `sameSite: 'lax'` — request từ site khác không mang cookie đi, chặn CSRF cho mọi thao tác POST.
 * - `secure`    — chỉ gửi qua HTTPS. Tắt ở môi trường dev vì `http://localhost` không có HTTPS.
 * - `maxAge`    — khớp hạn phiên của backend, để trình duyệt tự dọn cookie đã chết.
 */
export async function signIn(email: string, password: string): Promise<AdminDto> {
  const result = await authFetch<SignInDto>('/login', { method: 'POST', body: { email, password } })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000)),
  })
  return result.admin
}

/**
 * Đăng xuất: huỷ phiên ở BACKEND trước, rồi mới xoá cookie.
 *
 * Thứ tự đó quan trọng. Xoá cookie mà không gọi backend thì phiên vẫn sống trong database —
 * ai đã sao được token vẫn dùng tiếp được. Đăng xuất phải là thu hồi, không phải quên.
 *
 * Backend hỏng thì vẫn xoá cookie: người dùng thoát được khỏi máy này. Nói rõ qua giá trị trả về.
 */
export async function signOut(): Promise<{ revoked: boolean }> {
  const token = await sessionToken()
  let revoked = true
  if (token !== null) {
    try {
      await authFetch<void>('/logout', { method: 'POST', token })
    } catch {
      revoked = false
    }
  }
  ;(await cookies()).delete(SESSION_COOKIE)
  return { revoked }
}

/** Admin của phiên hiện tại. `null` = chưa đăng nhập hoặc phiên đã hết hiệu lực. */
export async function currentAdmin(): Promise<AdminDto | null> {
  const token = await sessionToken()
  if (token === null) return null
  try {
    return await authFetch<AdminDto>('/me', { token })
  } catch {
    return null
  }
}
