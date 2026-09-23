'use server'

import { redirect } from 'next/navigation'
import { signIn, signOut } from '@/lib/api/auth'
import { toResult, type ActionResult } from '@/lib/api/result'

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
