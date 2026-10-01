import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { CosmicBackground } from '@/components/cosmic-background'
import { LocaleToggle } from '@/components/locale-switcher'
import { Panel } from '@/components/panel'
import { currentAdmin } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * Trang đăng nhập — màn DUY NHẤT vào được khi chưa có phiên (`middleware.ts`).
 *
 * Không dùng `<AppShell>`: shell đọc danh sách app qua `/admin/apps`, mà chưa đăng nhập thì
 * đường đó đóng. Vì vậy trang này nằm ngoài `<AppGate>` luôn — xem `app/layout.tsx`.
 */
export default async function Page() {
  // Đã đăng nhập rồi mà mở /login thì vào thẳng console, không bắt đăng nhập lại.
  if ((await currentAdmin()) !== null) redirect('/')

  return (
    <>
      <CosmicBackground />
      <div className="absolute top-4 right-4 z-10">
        <LocaleToggle />
      </div>
      <div className="relative flex min-h-dvh items-center justify-center px-4">
        <Panel className="w-full max-w-sm px-6 py-8">
          <LoginForm />
        </Panel>
      </div>
    </>
  )
}
