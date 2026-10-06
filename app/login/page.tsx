import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { CosmicBackground } from '@/components/cosmic-background'
import { LocaleToggle } from '@/components/locale-switcher'
import { Panel } from '@/components/panel'
import { currentAdmin, microsoftSignInEnabled } from '@/lib/api/auth'
import { messageOf } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'

export const dynamic = 'force-dynamic'

/**
 * Trang đăng nhập — màn DUY NHẤT vào được khi chưa có phiên (`middleware.ts`).
 *
 * Không dùng `<AppShell>`: shell đọc danh sách app qua `/admin/apps`, mà chưa đăng nhập thì
 * đường đó đóng. Vì vậy trang này nằm ngoài `<AppGate>` luôn — xem `app/layout.tsx`.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  // Đã đăng nhập rồi mà mở /login thì vào thẳng console, không bắt đăng nhập lại.
  if ((await currentAdmin()) !== null) redirect('/')
  const [microsoftEnabled, initialError] = await Promise.all([microsoftSignInEnabled(), callbackError((await searchParams).error)])

  return (
    <>
      <CosmicBackground />
      <div className="absolute top-4 right-4 z-10">
        <LocaleToggle />
      </div>
      <div className="relative flex min-h-dvh items-center justify-center px-4">
        <Panel className="w-full max-w-sm px-6 py-8">
          <LoginForm microsoftEnabled={microsoftEnabled} initialError={initialError} />
        </Panel>
      </div>
    </>
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
