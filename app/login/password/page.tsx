import { redirect } from 'next/navigation'
import { PasswordSignInForm } from '@/components/login-form'
import { LoginFrame } from '@/components/login-frame'
import { currentAdmin, microsoftSignInEnabled } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * Đăng nhập bằng email + mật khẩu — cho tài khoản do `admin-cli` cấp mật khẩu riêng (ADR-0019).
 * Trang `/login` không trỏ sang đây; địa chỉ này đưa riêng cho người cần.
 */
export default async function Page() {
  if ((await currentAdmin()) !== null) redirect('/')
  return (
    <LoginFrame>
      <PasswordSignInForm microsoftEnabled={await microsoftSignInEnabled()} />
    </LoginFrame>
  )
}
