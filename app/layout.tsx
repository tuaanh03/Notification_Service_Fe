import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RoleProvider } from '@/components/role-context'
import { AppProvider } from '@/components/app-context'
import { AppGate } from '@/components/app-gate'
import { Toaster } from '@/components/ui/sonner'
import { listApps, toApp } from '@/lib/api/apps'
import { ApiError, messageOf } from '@/lib/api/problem'
import type { App } from '@/lib/mock-data'
const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--next-font-sans' })
const space = Space_Grotesk({ subsets: ['latin'], variable: '--next-font-heading' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--next-font-mono' })
export const metadata: Metadata = {
  title: 'EWS Notification Service',
  description: 'Nền tảng thông báo nội bộ EWS',
  // metadata.icons KHÔNG tự thêm basePath -> phải tự ghép, nếu không 404 khi
  // console đứng sau prefix. BASE_PATH inline lúc build (next.config.mjs).
  icons: {
    icon: `${process.env.BASE_PATH ?? ''}/icon.svg`,
    apple: `${process.env.BASE_PATH ?? ''}/apple-icon.png`,
  },
}
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#FFFFFF' }

/** Console quản trị luôn đọc trạng thái thật — không phục vụ bản dựng sẵn lúc build. */
export const dynamic = 'force-dynamic'

/**
 * Nơi DUY NHẤT nạp danh sách app. Chạy phía server nên `EWS_ADMIN_TOKEN` không rời máy chủ.
 * API hỏng không làm sập toàn bộ console — trả lý do để `<NoAppsScreen>` nói ra.
 */
async function loadApps(): Promise<{ apps: App[]; error: string | null }> {
  try {
    return { apps: (await listApps()).map(toApp), error: null }
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    return { apps: [], error: `${messageOf(err)} (mã: ${err.code})` }
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { apps, error } = await loadApps()
  return (
    <html lang="vi" className="light bg-background">
      <body className={`${inter.variable} ${space.variable} ${mono.variable} antialiased`}>
        <RoleProvider>
          <AppProvider apps={apps}>
            {/*
              Layout KHÔNG tự chọn màn hình: nó là server component, không đọc được đường dẫn nên
              chỉ trả lời được một câu cho mọi trang. `<AppGate>` (client) mới biết đang ở đâu và
              dựng khung tương ứng — shell, trang chọn app, màn chưa có app, hay màn báo lỗi.
            */}
            <AppGate error={error}>{children}</AppGate>
          </AppProvider>
        </RoleProvider>
        <Toaster theme="light" position="bottom-right" richColors />
      </body>
    </html>
  )
}
