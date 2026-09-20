'use client'
import { createContext, useContext, useMemo, useState } from 'react'
import type { App } from '@/lib/mock-data'

/**
 * App đang chọn ở app switcher (AppShell) — scoping control chính, giống OneSignal.
 * Mọi màn hình đọc `useApp().app` thay vì import `currentApp` từ mock.
 *
 * Danh sách app do `app/layout.tsx` (server component) nạp từ `/admin/apps` rồi truyền
 * xuống — context KHÔNG tự đọc mock nữa. Layout chỉ render provider khi danh sách có ít
 * nhất một app, nên `app` luôn tồn tại và màn hình con không phải xử lý `null`.
 */
type AppContextValue = { app: App; apps: App[]; setApp: (slug: string) => void }

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ apps, children }: { apps: App[]; children: React.ReactNode }) {
  const [slug, setSlug] = useState(apps[0].slug)
  const value = useMemo<AppContextValue>(
    // Slug không còn trong danh sách (app bị thu hồi giữa chừng) -> rơi về app đầu tiên.
    () => ({ app: apps.find((a) => a.slug === slug) ?? apps[0], apps, setApp: setSlug }),
    [apps, slug],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  // Ném lỗi rõ ràng còn hơn trả về một app giả và để màn hình hiện số của app khác.
  if (!ctx) throw new Error('useApp() phải nằm trong <AppProvider>')
  return ctx
}
