'use client'

import { useMemo, type ComponentProps } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { withApp } from '@/lib/app-routes'
import { useAppSelection } from './app-context'

/**
 * Link nội bộ TỰ MANG `?app=` của app đang xem (`lib/app-routes.ts`).
 *
 * Đây là file DUY NHẤT được import `next/link` và `useRouter`: một link trần là một chỗ làm mất
 * app — người dùng bị đẩy ra trang chọn app giữa chừng. `app` = chỉ định app khác (trang chọn app).
 * Chưa có app (màn `/admin`) thì để nguyên đường dẫn.
 */
export function AppLink({ href, app, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string; app?: string }) {
  const { app: current } = useAppSelection()
  return <Link href={withApp(href, app ?? current?.slug ?? null)} {...props} />
}

type Options = { app?: string }

/** `router.push` / `replace` tự mang `?app=`, như `<AppLink>`. */
export function useAppRouter() {
  const router = useRouter()
  const { app } = useAppSelection()
  const current = app?.slug ?? null
  return useMemo(
    () => ({
      push: (href: string, options?: Options) => router.push(withApp(href, options?.app ?? current)),
      replace: (href: string, options?: Options) => router.replace(withApp(href, options?.app ?? current)),
      refresh: () => router.refresh(),
    }),
    [router, current],
  )
}
