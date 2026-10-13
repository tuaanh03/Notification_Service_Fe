import { redirect } from 'next/navigation'
import { MicrosoftSignIn } from '@/components/login-form'
import { LoginFrame } from '@/components/login-frame'
import { currentAdmin, microsoftSignInEnabled } from '@/lib/api/auth'
import { messageOf } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'
import { safeNext } from '@/lib/safe-next'

export const dynamic = 'force-dynamic'

/**
 * Trang đăng nhập — CHỈ Microsoft 365. Cùng `/login/password` là hai màn vào được khi chưa có
 * phiên (`middleware.ts`).
 *
 * Không dùng `<AppShell>`: shell đọc danh sách app qua `/admin/apps`, mà chưa đăng nhập thì
 * đường đó đóng. Vì vậy trang này nằm ngoài `<AppGate>` luôn — xem `app/layout.tsx`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>
}) {
  // Đã đăng nhập rồi mà mở /login thì vào thẳng console, không bắt đăng nhập lại.
  if ((await currentAdmin()) !== null) redirect('/')
  const params = await searchParams
  // Backend chưa cấu hình M365 (máy dev) thì trang này không có nút nào dùng được — sang form mật khẩu.
  if (!(await microsoftSignInEnabled())) {
    const next = safeNext(typeof params.next === 'string' ? params.next : undefined)
    redirect(next === '/' ? '/login/password' : `/login/password?next=${encodeURIComponent(next)}`)
  }

  return (
    <LoginFrame>
      <MicrosoftSignIn initialError={await callbackError(params.error)} />
    </LoginFrame>
  )
}

/**
 * `?error=<MÃ>` do trang callback Microsoft gắn khi đăng nhập hỏng. Chỉ nhận mã dạng `CHỮ_HOA` và chỉ
 * hiện câu đã dịch của mã đó — ai sửa URL cũng không chèn được chữ của họ lên trang đăng nhập.
 */
async function callbackError(raw: string | string[] | undefined): Promise<string | null> {
  if (typeof raw !== 'string' || !/^[A-Z0-9_]{1,64}$/.test(raw)) return null
  return messageOf(new ApiError({ status: 401, code: raw, detail: '' }))
}
