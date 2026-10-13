import { CosmicBackground } from '@/components/cosmic-background'
import { LocaleToggle } from '@/components/locale-switcher'
import { Panel } from '@/components/panel'

/** Khung chung của hai trang đăng nhập (`/login`, `/login/password`): nền, nút đổi ngôn ngữ, thẻ giữa màn. */
export function LoginFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CosmicBackground />
      <div className="absolute top-4 right-4 z-10">
        <LocaleToggle />
      </div>
      <div className="relative flex min-h-dvh items-center justify-center px-4">
        <Panel className="w-full max-w-sm px-6 py-8">{children}</Panel>
      </div>
    </>
  )
}
