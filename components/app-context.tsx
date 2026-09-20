'use client'
import { createContext, useContext, useState } from 'react'
import { apps, currentApp, type App } from '@/lib/mock-data'

/**
 * App đang chọn ở app switcher (AppShell) — scoping control chính, giống OneSignal.
 * Mọi màn hình đọc `useApp().app` thay vì import `currentApp` từ mock.
 */
const AppContext = createContext<{ app: App; setApp: (slug: string) => void }>({
  app: currentApp,
  setApp: () => {},
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [app, setAppState] = useState<App>(currentApp)
  const setApp = (slug: string) => setAppState(apps.find((a) => a.slug === slug) ?? currentApp)
  return <AppContext.Provider value={{ app, setApp }}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
