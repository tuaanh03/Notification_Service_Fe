'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { M365_CALLBACK_PATH, M365_STATE_COOKIE, signIn, signOut, startMicrosoftSignIn } from '@/lib/api/auth'
import { toResult, type ActionResult } from '@/lib/api/result'
import { safeNext } from '@/lib/safe-next'

/**
 * Đăng nhập. Trả `ActionResult` chứ không ném: bản production của Next thay message thật bằng
 * chuỗi chung, người trực mất luôn lý do (CLAUDE.md mục 2.2).
 *
 * Backend cố tình trả CÙNG mã `INVALID_CREDENTIALS` cho email lạ và mật khẩu sai — màn hình
 * cũng chỉ nói đúng chừng đó, không đoán thêm.
 */
export async function signInAction(input: { email: string; password: string }): Promise<ActionResult<{ email: string }>> {
  const result = await toResult(() => signIn(input.email, input.password))
  return result.ok ? { ok: true, data: { email: result.data.email } } : result
}

/** Đăng xuất rồi về trang đăng nhập. `redirect` phải nằm ngoài try/catch — nó hoạt động bằng cách ném. */
export async function signOutAction(): Promise<void> {
  await signOut()
  redirect('/login')
}

/**
 * Bắt đầu đăng nhập Microsoft: lấy link từ backend, ghi `state` (+ nơi định tới) vào cookie rồi chuyển
 * trình duyệt sang Microsoft. Lỗi thì trả `ActionResult` để form hiện câu đã dịch.
 *
 * Cookie chỉ gửi về đúng trang callback (`path`), sống 10 phút — bằng hạn lượt đăng nhập ở backend.
 * `sameSite: 'lax'` (không phải `strict`): Microsoft đưa người dùng về bằng một lần chuyển trang từ
 * site khác, `strict` sẽ làm trình duyệt không gửi cookie và lượt nào cũng hỏng.
 */
export async function startMicrosoftSignInAction(next: string): Promise<ActionResult<never>> {
  const result = await toResult(startMicrosoftSignIn)
  if (!result.ok) return result
  ;(await cookies()).set(M365_STATE_COOKIE, JSON.stringify({ state: result.data.state, next: safeNext(next) }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: M365_CALLBACK_PATH,
    maxAge: 10 * 60,
  })
  redirect(result.data.authorizeUrl)
}
