'use client'
import { createContext, useContext, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { APP_PARAM } from '@/lib/app-routes'
import type { App } from '@/lib/mock-data'

/**
 * App đang xem — ĐỌC TỪ ĐƯỜNG DẪN (`?app=<slug>`), không giữ trong state (`lib/app-routes.ts`).
 * Ô chọn app trên AppShell chỉ hiển thị và đổi tham số đó.
 *
 * Danh sách app do `app/layout.tsx` (server component) nạp từ `/admin/apps` rồi truyền
 * xuống. Layout chỉ render provider khi danh sách có ít nhất một app.
 */
type AppSelection = {
  /** `null` = đường dẫn chưa có `?app=` hợp lệ. Màn của một app không bao giờ thấy null (`<AppGate>`). */
  app: App | null
  apps: App[]
  /** Giá trị `?app=` thô — để trang chọn app nói được "không có app «x»". */
  requested: string | null
}

const AppContext = createContext<AppSelection | null>(null)

const LAST_APP_KEY = 'ews.last-app'

/** App dùng gần nhất trên máy này — CHỈ để đánh dấu ở trang chọn app, không bao giờ tự chọn. */
export function readLastApp(): string | null {
  try {
    return window.localStorage.getItem(LAST_APP_KEY)
  } catch {
    return null
  }
}

export function AppProvider({ apps, children }: { apps: App[]; children: React.ReactNode }) {
  const requested = useSearchParams().get(APP_PARAM)
  const value = useMemo<AppSelection>(
    () => ({ app: apps.find((a) => a.slug === requested) ?? null, apps, requested }),
    [apps, requested],
  )

  const slug = value.app?.slug
  useEffect(() => {
    if (!slug) return
    try {
      window.localStorage.setItem(LAST_APP_KEY, slug)
    } catch {
      // Trình duyệt chặn lưu trữ: chỉ mất nhãn "dùng gần nhất".
    }
  }, [slug])

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
