'use client'
import { createContext, useContext, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { APP_PARAM, appKey } from '@/lib/app-routes'
import type { App } from '@/lib/mock-data'

/**
 * App đang xem — ĐỌC TỪ ĐƯỜNG DẪN (`?app=<app_id>`), không giữ trong state (`lib/app-routes.ts`).
 * Ô chọn app trên AppShell chỉ hiển thị và đổi tham số đó.
 *
 * Danh sách app do `app/layout.tsx` (server component) nạp từ `/admin/apps` rồi truyền
 * xuống. Provider LUÔN được dựng, kể cả khi danh sách rỗng: màn "chưa có app nào" cũng cần link
 * nội bộ (`<AppLink>`), mà link nội bộ đọc app đang chọn từ đây. Rỗng thì `app` là `null` —
 * `<AppGate>` lo việc màn nào được dựng trong trạng thái đó.
 */
type AppSelection = {
  /** `null` = đường dẫn chưa có `?app=` hợp lệ. Màn của một app không bao giờ thấy null (`<AppGate>`). */
  app: App | null
  apps: App[]
  /** Giá trị `?app=` thô — `<AppGate>` chuyển nó sang trang Tổ chức để báo "không có app «x»". */
  requested: string | null
}

const AppContext = createContext<AppSelection | null>(null)

export function AppProvider({ apps, children }: { apps: App[]; children: React.ReactNode }) {
  const requested = useSearchParams().get(APP_PARAM)
  const value = useMemo<AppSelection>(
    () => ({ app: apps.find((a) => appKey(a) === requested) ?? null, apps, requested }),
    [apps, requested],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/** Cho khung console (sidebar, ô chọn app, link): chấp nhận chưa có app — màn `/admin` vào không cần app. */
export function useAppSelection(): AppSelection {
  const ctx = useContext(AppContext)
  // Ném lỗi rõ ràng còn hơn trả về một app giả và để màn hình hiện số của app khác.
  if (!ctx) throw new Error('useAppSelection() phải nằm trong <AppProvider>')
  return ctx
}

/** Cho màn của MỘT app: luôn có app. `<AppGate>` đã chặn đường dẫn thiếu app trước khi màn render. */
export function useApp(): { app: App; apps: App[] } {
  const { app, apps } = useAppSelection()
  if (!app) throw new Error('useApp() chỉ dùng trong màn của một app — route này phải qua <AppGate> (lib/app-routes.ts)')
  return { app, apps }
}
