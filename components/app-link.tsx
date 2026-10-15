'use client'

import { useMemo, type ComponentProps } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { appKey, withApp } from '@/lib/app-routes'
import { useAppSelection } from './app-context'

/**
 * Link nội bộ TỰ MANG `?app=` của app đang xem (`lib/app-routes.ts`).
 *
 * Đây là file DUY NHẤT được import `next/link` và `useRouter`: một link trần là một chỗ làm mất
 * app — người dùng bị đẩy sang trang Tổ chức chọn lại app giữa chừng. `app` = chỉ định app khác (bảng
 * app của một org, bước 4 wizard); `app={null}` = CỐ Ý bỏ app. Chưa có app thì để nguyên đường dẫn.
 */
export function AppLink({ href, app, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string; app?: string | null }) {
  const { app: current } = useAppSelection()
  return <Link href={withApp(href, app === undefined ? (current ? appKey(current) : null) : app)} {...props} />
}

type Options = { app?: string | null }

/** `router.push` / `replace` tự mang `?app=`, như `<AppLink>`. */
export function useAppRouter() {
  const router = useRouter()
  const { app } = useAppSelection()
  const current = app ? appKey(app) : null
  return useMemo(
    () => ({
      push: (href: string, options?: Options) => router.push(withApp(href, options?.app === undefined ? current : options.app)),
      replace: (href: string, options?: Options) =>
        router.replace(withApp(href, options?.app === undefined ? current : options.app)),
      refresh: () => router.refresh(),
    }),
    [router, current],
  )
}
