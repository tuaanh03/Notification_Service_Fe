'use client'

import { useEffect, useMemo, useState, type ComponentProps } from 'react'
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
export function AppLink({ href, app, onNavigate, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string; app?: string | null }) {
  const { app: current } = useAppSelection()
  const target = withApp(href, app === undefined ? (current ? appKey(current) : null) : app)
  return (
    <Link
      href={target}
      onNavigate={(e) => {
        onNavigate?.(e)
        if (leaveGuard?.(target)) e.preventDefault()
      }}
      {...props}
    />
  )
}

/**
 * Chặn rời trang khi còn thay đổi chưa lưu — một màn đăng ký tại một thời điểm (màn soạn template).
 * Trả `true` = đã giữ lại, màn tự hỏi người dùng. Chỉ chặn được đường đi qua `<AppLink>` / `useAppRouter()`
 * (cộng `beforeunload` khi đóng tab / tải lại); nút Back của trình duyệt KHÔNG chặn được.
 */
let leaveGuard: ((href: string) => boolean) | null = null

/**
 * `active` = đang có thay đổi chưa lưu. `pendingHref` khác null = người dùng vừa định rời đi — màn hiện
 * `<ConfirmDialog>`; `leave()` bỏ chặn rồi đi tiếp, `stay()` ở lại.
 */
export function useLeaveGuard(active: boolean) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  useEffect(() => {
    if (!active) return
    const guard = (href: string) => {
      setPendingHref(href)
      return true
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Chrome cũ chỉ hỏi khi có returnValue.
      e.returnValue = ''
    }
    leaveGuard = guard
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      if (leaveGuard === guard) leaveGuard = null
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [active])
  return {
    pendingHref,
    stay: () => setPendingHref(null),
    leave: () => {
      const href = pendingHref
      leaveGuard = null
      setPendingHref(null)
      if (href) router.push(href)
    },
  }
}

type Options = { app?: string | null }

/** `router.push` / `replace` tự mang `?app=`, như `<AppLink>`. */
export function useAppRouter() {
  const router = useRouter()
  const { app } = useAppSelection()
  const current = app ? appKey(app) : null
  return useMemo(
    () => ({
      push: (href: string, options?: Options) => {
        const target = withApp(href, options?.app === undefined ? current : options.app)
        if (!leaveGuard?.(target)) router.push(target)
      },
      replace: (href: string, options?: Options) => {
        const target = withApp(href, options?.app === undefined ? current : options.app)
        if (!leaveGuard?.(target)) router.replace(target)
      },
      refresh: () => router.refresh(),
    }),
    [router, current],
  )
}
