'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { isOrgRoute } from '@/lib/app-routes'
import { AppChooser } from './app-chooser'
import { useAppSelection } from './app-context'
import { useAppRouter } from './app-link'

/**
 * Cổng chặn giữa đường dẫn và màn hình (`lib/app-routes.ts`).
 *
 * - Màn toàn tổ chức (`ORG_ROUTES`) -> vào thẳng.
 * - Màn của một app, có `?app=` hợp lệ -> vào.
 * - Thiếu `?app=` và tổ chức CHỈ có một app -> tự thêm (không có gì để chọn).
 * - Còn lại -> `<AppChooser>` toàn màn, thay cả AppShell.
 *
 * Chưa qua cổng thì màn con KHÔNG render: không có khoảnh khắc nào hiện dữ liệu của app sai.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const router = useAppRouter()
  const { app, apps, requested } = useAppSelection()

  const open = isOrgRoute(pathname) || app !== null
  const only = !open && requested === null && apps.length === 1 ? apps[0].slug : null
  const here = search ? `${pathname}?${search}` : pathname

  useEffect(() => {
    if (only) router.replace(here, { app: only })
  }, [only, here, router])

  if (open) return children
  if (only) return null
  return <AppChooser apps={apps} requested={requested} here={here} />
}
